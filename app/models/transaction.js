'use strict'
const _ = require('lodash')

module.exports = (db, DataTypes) => db.define('Transaction', {
  amount: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  },

  type: {
    type: DataTypes.VIRTUAL(DataTypes.STRING, ['Bet', 'Win']),
    get: function () {
      if ((this.Bet === undefined) && (this.Win === undefined)) return
      if (this.Bet) return 'bet'
      if (this.Win) return 'win'
      if (this.amount >= 0) return 'deposit'
      else return 'withdrawal'
    }
  }

}, {
  classMethods: {
    associate: function (models) {
      this.hasOne(models.Bet, { as: 'Bet', foreignKey: 'BetTransactionId' })
      this.hasOne(models.Bet, { as: 'Win', foreignKey: 'WinTransactionId' })

      this.belongsTo(models.User, { foreignKey: { allowNull: false } })
    },

    joi: function (mode) {
      const Joi = db.Joi

      return Joi.object({
        id: Joi.id(),
        amount: Joi.number(),
        createdAt: Joi.date(),
        type: Joi.string().valid('deposit', 'withdrawal', 'bet', 'win'),
        bet: Joi.id()
      })
    }
  },

  scopes: {
    bets: () => ({
      include: [
        db.models.Transaction.associations.Bet,
        db.models.Transaction.associations.Win
      ]
    })
  },

  instanceMethods: {
    toJSON: function () {
      const json = _.pick(this, ['id', 'amount', 'createdAt'])
      const type = this.type
      if (type) {
        json.type = type
        if (this.Bet) json.bet = this.Bet.id
        if (this.Win) json.bet = this.Win.id
      }
      return json
    }
  }
})

