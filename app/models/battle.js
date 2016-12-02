'use strict'
const _ = require('lodash')

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
  }
}, {
  classMethods: {
    associate: function (models) {
      this.hasMany(models.Bet, { foreignKey: { allowNull: false } })
      this.hasMany(models.Team, { foreignKey: { allowNull: false } })
    },

    resultFromApi: (api) => !api.winner ? null
      : api.winner.trainer_id === api.team1.trainer.id ? 1 : 2,

    createFromApi: function (api) {
      return this
        .findOrCreate({
          where: { id: api.id },
          defaults: {
            startTime: new Date(api.start_time),
            endTime: !api.end_time ? null : new Date(api.end_time),
            result: this.resultFromApi(api)
          }
        })
        .then(([battle, created]) =>
          !created ? battle
            : Promise.resolve([api.team1, api.team2])
            .then((teams) =>
              teams.map((t, i) =>
                db.models.Trainer
                  .createFromApi(t.trainer)
                  .then((trainer) => battle.createTeam({ index: i + 1, TrainerId: trainer.id }))
                  .then((team) => team)// TODO: add pokemons
              ))
            .then((teams) => Promise.all(teams))
            .then((teams) => battle))
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
    })
  },

  instanceMethods: {
    getOdds: function () {
      return this
        .getBets({ include: db.models.Bet.associations.Transaction })
        .then((bets) => bets.filter((b) => b.ParentId === null))
        .then((bets) =>
          bets.reduce(([win, lose], bet) =>
            (bet.choice === 1)
              ? [win - bet.Transaction.amount, lose]
              : [win, lose - bet.Transaction.amount],
            [0, 0]))
    },

    // Sync this battle's result with remote API. We assume that except for the
    // result, a battle is immutable.
    syncResult: function () {
      // Result is already set; can't change this battle anymore
      if (this.result) return Promise.resolve([])

      return db.client
        .get(`battles/${this.id}`)
        .then((res) =>
          res.res.statusCode === 200
            ? res.body
            : Promise.reject(res.res)) // TODO
        .then(this.Model.resultFromApi)
        .then((result) =>
          !result ? []
            : db.transaction((t) => this
              .update({ result: result }, { transaction: t })
                .then(() => this.getBets({ transaction: t }))
                .then((bets) => bets.map((b) => b.syncResult(this.result, t)))
                .then((updates) => Promise.all(updates))
                .then(_.flatMap)
            ))
    },

    scheduleSync: function () {
      const now = new Date()
      if (this.result) {
        console.log(`[${this.id}].scheduleSync() > DONE`)
        return
      }

      const next = this.endTime
        ? Math.max(0, this.endTime - now) + 10 * 1000 // TODO: save intervals as global constants
        : Math.max(0, this.startTime - now) + 10 * 1000

      console.log(`[${this.id}].scheduleSync() > in ${next / 1000}s`)
      setTimeout(() => this.syncResult().then(() => this.scheduleSync()), next)
    }
  }
})

