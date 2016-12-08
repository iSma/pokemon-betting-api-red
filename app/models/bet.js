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
    transactions: () => ({
      include: [
        db.models.Bet.associations.BetTransaction,
        db.models.Bet.associations.WinTransaction
      ]
    }),

    active: () => ({
      include: [db.models.Battle.scope('active')]
    }),

    started: () => ({
      include: [db.models.Battle.scope('started')]
    }),

    ended: () => ({
      include: [db.models.Battle.scope('ended')]
    })
  },

  instanceMethods: {
    getOdds: function ({ transaction: t } = {}) {
      return this
        .getBets({ scope: 'transactions', transaction: t })
        .then((bets) =>
          bets.reduce(([w, l], bet) =>
            (bet.choice === 1)
              ? [w - bet.BetTransaction.amount, l]
              : [w, l - bet.BetTransaction.amount],
            [0, 0]))
    },

    getAmount: function ({ transaction: t } = {}) {
      return this
        .getBetTransaction({ transaction: t })
        .then((t) => -t.amount)
    },

    toJSON: function () {
      const json = _.pick(this, ['id', 'startTime', 'endTime', 'choice', 'result'])
      return _.merge(json, {
        user: this.UserId,
        battle: this.BattleId,
        parent: this.ParentId
      })
    },

    syncResult: function (result, [w, l], { transaction: t } = {}) {
      // TODO: Keep percentage of wins + unclaimed money
      const r = 1 + (this.choice !== result)
      const total = w + l
      const share = this.choice === 1 ? w : l

      return this
        .update({ result }, { transaction: t })
        .then(() => !this.won ? null
          : this
            .getAmount({ transaction: t })
            .then((amount) => amount / share * total)
            .then((amount) => ({ amount, UserId: this.UserId }))
            .then((wintr) => this.createWinTransaction(wintr, { transaction: t })))
        .then(() => [
          this.getBets({ transaction: t }),
          this.getOdds({ transaction: t })
        ])
        .then((x) => Promise.all(x))
        .then(([bets, odds]) =>
          bets.map((b) => b.syncResult(r, odds, { transaction: t })))
        .then((updates) => Promise.all(updates))
        .then(_.flatMap)
    }
  }
})

