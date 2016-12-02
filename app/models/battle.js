'use strict'

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

    fromApi: function (battle) {
      return {
        id: battle.id,
        startTime: new Date(battle.start_time),
        endTime: battle.end_time ? new Date(battle.end_time) : null,
        result:
          battle.winner
          ? 1 + (battle.winner.trainer_id !== battle.team1.trainer.id)
          : null
        // TODO: add trainers
      }
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

    // Sync this battle with remote API
    syncRemote: function () {
      return db.client
        .get(`battles/${this.id}`)
        .then((res) =>
          res.res.statusCode === 200
            ? res.body
            : Promise.reject(res.res)) // TODO
        .then((battle) => this.Model.fromApi(battle))
        .then((battle) => this.set(battle))
        .then(() =>
          this.changed('result')
            ? db.transaction((t) => {
              return this
                .save({ transaction: t })
                .then(() => this.getBets({ transaction: t }))
                .then((bets) => bets.map((b) => b.updateResult(this.result, t)))
                .then((updates) => Promise.all(updates))
            })
            : this.save()
        )
        .then(() => this)
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
      setTimeout(() => this.syncRemote().then(() => this.scheduleSync()), next)
    }
  }
})

