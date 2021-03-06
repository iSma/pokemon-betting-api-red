'use strict'
const bcrypt = require('bcryptjs')
const Boom = require('boom')

const hash = (user) =>
  (!user.changed('pass'))
  ? null
  : user.Model.hash(user.get('pass')).then((hash) => user.set('pass', hash))

module.exports = (db, DataTypes) => db.define('User', {
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },

  mail: {
    type: DataTypes.STRING,
    unique: true,
    validate: { isEmail: true },
    allowNull: false
  },

  // Bcrypt hashed password
  pass: {
    type: DataTypes.STRING,
    allowNull: false
  }

}, {
  classMethods: {
    associate: function (models) {
      this.hasMany(models.Bet, { foreignKey: { allowNull: false } })
      this.hasMany(models.Transaction, { foreignKey: { allowNull: false } })
    },

    // Promisified bcrypt hashing
    hash: function (pass) {
      return new Promise((resolve, reject) => {
        bcrypt.hash(pass, 10, (err, hash) => (err) ? reject(err) : resolve(hash))
      })
    },

    joi: function (mode) {
      const Joi = db.Joi

      if (mode === 'stats') {
        return Joi.object({
          id: Joi.id(),
          all: Joi.bStats(),
          onBattle: Joi.bStats(),
          onBet: Joi.bStats()
        })
      } else if (mode === 'min') {
        return Joi.object({
          id: Joi.id(),
          name: Joi.string()
        })
      } else {
        return Joi.object({
          id: Joi.id(),
          name: Joi.string(),
          mail: Joi.string().email()
        })
      }
    }
  },

  instanceMethods: {
    // Verify a user-provided password
    verify: function (pass) {
      return new Promise((resolve, reject) => {
        bcrypt.compare(pass, this.pass, (err, ok) => (err) ? reject(err) : resolve(ok))
      })
    },

    getMoney: function () {
      return db.models.Transaction
        .sum('amount', { where: { UserId: this.id } })
        .then((money) => Number.isNaN(money) ? 0 : money)
    },

    getStats: function () {
      return this
        .getBets({ scope: 'ended' })
        .then((bets) => {
          const onBattle = bets.filter((b) => !b.ParentId)
          const onBet = bets.filter((b) => b.ParentId)

          return {
            id: this.id,

            all: {
              total: bets.length,
              won: bets.filter((b) => b.won).length,
              lost: bets.filter((b) => !b.won).length
            },

            onBattle: {
              total: onBattle.length,
              won: onBattle.filter((b) => b.won).length,
              lost: onBattle.filter((b) => !b.won).length
            },

            onBet: {
              total: onBet.length,
              won: onBet.filter((b) => b.won).length,
              lost: onBet.filter((b) => !b.won).length
            }
          }
        })
    },

    placeBet: function (event, amount, choice) {
      amount = Math.abs(amount)
      const onBet = event.Model === db.models.Bet

      return db.transaction((t) =>
        Promise.resolve(onBet ? event.getBattle({ transaction: t }) : event)
          .then((battle) => battle.active ? true
            : Promise.reject(Boom.resourceGone(`Battle ${battle.id} has already started`)))
          .then(() => this.getMoney({ transaction: t }))
          .then((money) => money >= amount ? true
            : Promise.reject(Boom.paymentRequired(`Not enough money (available funds: ${money})`)))
          .then(() => this.createTransaction({ amount: -amount }, { transaction: t }))
          .then((trns) => this.createBet({
            choice: choice,
            BattleId: onBet ? event.BattleId : event.id,
            ParentId: onBet ? event.id : null,
            BetTransactionId: trns.id
          }, { transaction: t }))
      )
    }
  },

  hooks: {
    beforeCreate: hash,
    beforeUpdate: hash
  }
})

