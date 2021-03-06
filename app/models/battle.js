'use strict'
const _ = require('lodash')
const request = require('request-promise')

module.exports = (db, DataTypes) => db.define('Battle', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },

  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },

  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },

  result: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 2
    },
    allowNull: true
  },

  active: {
    type: DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['startTime']),
    get: function () {
      return this.startTime > new Date()
    }
  }
}, {
  classMethods: {
    associate: function (models) {
      this.hasMany(models.Bet, { foreignKey: { allowNull: false } })
      this.hasMany(models.Team, { foreignKey: { allowNull: false } })
    },

    fromApi: (api) => ({
      startTime: new Date(api.start_time),
      endTime: !api.end_time ? null : new Date(api.end_time),
      result: !api.winner ? null : api.winner.trainer_id === api.team1.trainer.id ? 1 : 2
    }),

    createFromApi: function (api) {
      return this
        .findOrCreate({
          where: { id: api.id },
          defaults: this.fromApi(api)
        })
        .then(([battle, created]) =>
          !created ? battle
            : Promise.resolve([api.team1, api.team2])
            .then((teams) => teams.map((t, i) => db.models.Team.createFromApi(t, battle, i)))
            .then((teams) => Promise.all(teams))
            .then((teams) => battle))
    },

    joi: function (mode) {
      const Joi = db.Joi

      return Joi.object({
        id: Joi.id(),
        startTime: Joi.date(),
        endTime: Joi.date(),
        result: Joi.choice(),
        teams: {
          1: db.models.Team.joi(),
          2: db.models.Team.joi()
        }
      })
    }
  },

  scopes: {
    active: () => ({
      where: {
        startTime: { $gt: new Date() }
      }
    }),

    started: () => ({
      where: {
        startTime: { $lte: new Date() },
        endTime: { $gt: new Date() }
      }
    }),

    ended: () => ({
      where: {
        endTime: { $lte: new Date() }
      }
    }),

    teams: () => ({
      include: [db.models.Team.scope('pokemons')]
    })
  },

  instanceMethods: {
    getOdds: function ({ transaction: t } = {}) {
      return this
        .getBets({ scope: 'transactions', transaction: t })
        .then((bets) => bets.filter((b) => b.ParentId === null))
        .then((bets) =>
          bets.reduce(([w, l], bet) =>
            (bet.choice === 1)
              ? [w - bet.BetTransaction.amount, l]
              : [w, l - bet.BetTransaction.amount],
            [0, 0]))
    },

    toJSON: function () {
      const json = _.pick(this, ['id', 'startTime', 'endTime', 'result'])

      if (this.Teams) {
        const indices = this.Teams.map((t) => t.index)
        const teams = this.Teams.map((t) => t.toJSON())
        json.teams = _.zipObject(indices, teams)
      }

      return json
    },

    // Sync this battle's result with remote API. We assume that except for the
    // result, a battle is immutable.
    syncResult: function () {
      const config = db.app.config
      // Result is already set; can't change this battle anymore
      if (this.result) return Promise.resolve([])

      return request
        .get(`${config.api.battle}/battles/${this.id}`)
        .then((res) => JSON.parse(res))
        .then(this.Model.fromApi)
        .then((api) =>
          !api.result
            ? this.update(api)
            : db.transaction((t) =>
              this.update(api, { transaction: t })
                .then(() => [
                  this.getBets({ where: {ParentId: null}, transaction: t }),
                  this.getOdds({ transaction: t })
                ])
                .then((x) => Promise.all(x))
                .then(([bets, odds]) =>
                  bets.map((b) => b.syncResult(this.result, odds, { transaction: t })))
                .then((updates) => Promise.all(updates))
                .then(_.flatMap)
            ))
    },

    scheduleSync: function () {
      const config = db.app.config
      const now = new Date()
      if (this.result) {
        console.log(`[${this.id}].scheduleSync() > DONE`)
        return
      }

      const next = this.endTime
        ? Math.max(0, this.endTime - now) + config.sync.minTime
        : Math.max(0, this.startTime - now) + config.sync.minTime

      console.log(`[${this.id}].scheduleSync() > in ${next / 1000}s`)
      setTimeout(() => this.syncResult().then(() => this.scheduleSync()), next)
    }
  }
})

