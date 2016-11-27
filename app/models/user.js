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
      return this.Model.associations.Transactions.target
        .sum('amount', { where: { UserId: this.id } })
        .then((money) => Number.isNaN(money) ? 0 : money)
    },

    placeBet: function (event, amount, choice) {
      const onBet = event.Model === this.Model.associations.Bets.target

      return Promise.resolve(onBet ? event.getBattle() : event)
        .then((battle) =>
          battle.active
            ? true
            : Promise.reject(Boom.ressourceGone(`Battle ${battle.id} has already started`))
        )
        .then(() => this.getMoney())
        .then((money) =>
          money >= amount
            ? true
            : Promise.reject(Boom.paymentRequired(`Not enough money (available funds: ${money})`))
        )
        .then(() =>
          db.transaction((t) =>
            this
              .createTransaction({ amount: amount }, { transaction: t })
              .then((transaction) =>
                this.createBet({
                  choice: choice,
                  BattleId: onBet ? event.BattleId : event.id,
                  ParentId: onBet ? event.id : null,
                  TransactionId: transaction.id
                }, { transaction: t }))
          ))
    }
  },

  hooks: {
    beforeCreate: hash,
    beforeUpdate: hash
  }
})

