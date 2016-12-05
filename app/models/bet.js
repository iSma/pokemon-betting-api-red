'use strict'
const _ = require('lodash')

module.exports = (db, DataTypes) => db.define('Bet', {
  // The result the user expects from this bet:
  // 1 = Trainer 1 wins / parent bet was right
  // 2 = Trainer 2 wins / parent bet was wrong
  choice: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 2
    },
    allowNull: false
  },

  // Same convention as choice.
  // The bet is won if choice == result.
  // null = battle isn't finished yet (or hasn't been synced).
  result: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 2
    },
    allowNull: true
  },

  // Virtual column, as a shortcut to check if the bet has been won.
  // null = battle isn't finished yet (or hasn't been synced).
  won: {
    type: DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['choice', 'result']),
    get: function () {
      return (this.result === null)
        ? null
        : this.result === this.choice
    }
  }

}, {
  classMethods: {
    associate: function (models) {
      this.belongsTo(this, { as: 'Parent' })
      this.hasMany(this, { foreignKey: 'ParentId' })

      this.belongsTo(models.Battle, { foreignKey: { allowNull: false } })
      this.belongsTo(models.User, { foreignKey: { allowNull: false } })

      this.belongsTo(models.Transaction, { as: 'BetTransaction', foreignKey: { allowNull: false } })
      this.belongsTo(models.Transaction, { as: 'WinTransaction' })
    }
  },

  scopes: {
    active: () => ({
      include: [{
        model: db.models.Battle,
        where: {
          startTime: { $gt: new Date() }
        }
      }]
    }),

    started: () => ({
      include: [{
        model: db.models.Battle,
        where: {
          startTime: { $lte: new Date() },
          endTime: { $gt: new Date() }
        }
      }]
    }),

    ended: () => ({
      include: [{
        model: db.models.Battle,
        where: {
          endTime: { $lte: new Date() }
        }
      }]
    })
  },

  instanceMethods: {
    getOdds: function () {
      return this
        .getBets({ include: this.Model.associations.BetTransaction })
        .then((bets) =>
          bets.reduce(([win, lose], bet) =>
            (bet.choice === 1)
              ? [win - bet.BetTransaction.amount, lose]
              : [win, lose - bet.BetTransaction.amount],
            [0, 0]))
    },

    getAmount: function () {
      return this
        .getBetTransaction()
        .then((t) => -t.amount)
    },

    toJSON: function () {
      const json = _.pick(this, ['id', 'startTime', 'endTime', 'result'])
      return _.merge(json, {
        user: this.UserId,
        battle: this.BattleId,
        parent: this.ParentId
      })
    },

    syncResult: function (result, { transaction: t }) {
      // TODO: Distribute money
      const r = 1 + (this.choice !== result)
      return this
        .update({ result: result }, { transaction: t })
        .then(() => this.getBets({ transaction: t }))
        .then((bets) => bets.map((b) => b.updateResult(r, { transaction: t })))
        .then(_.flatMap)
        .then((updates) => Promise.all(updates))
    }
  }
})

