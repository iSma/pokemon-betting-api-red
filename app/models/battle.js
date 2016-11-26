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
  },

  active: {
    type: DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['startTime']),
    get: function () {
      const now = new Date()
      return this.startTime > now
    }
  },

  started: {
    type: DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['startTime']),
    get: function () {
      const now = new Date()
      return this.startTime <= now && this.endTime > now
    }
  },

  finished: {
    type: DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['endTime']),
    get: function () {
      const now = new Date()
      return this.endTime <= now
    }
  }

}, {
  classMethods: {
    associate: function (models) {
      this.hasMany(models.Bet, { foreignKey: { allowNull: false } })

      this.addScope('active', function () {
        return {
          where: {
            startTime: { $gt: new Date() }
          }
        }
      })

      this.addScope('started', function () {
        return {
          where: {
            startTime: { $lte: new Date() },
            endTime: { $gt: new Date() }
          }
        }
      })

      this.addScope('finished', function () {
        return {
          where: {
            endTime: { $lte: new Date() }
          }
        }
      })
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

  instanceMethods: {
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
        return
      } else if (!this.endTime) {
        const next = Math.max(0, this.startTime - now) + 10 * 1000
        setTimeout(() => this.syncRemote().then(() => this.scheduleSync()), next)
      } else {
        const next = Math.max(0, this.endTime - now) + 10 * 1000
        setTimeout(() => this.syncRemote().then(() => this.scheduleSync()), next)
      }
    }
  }
})

