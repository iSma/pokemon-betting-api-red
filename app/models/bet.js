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
      this.belongsTo(this, { as: 'Parent', foreignKey: 'ParentId' })
      this.hasMany(this, { as: 'Bet', foreignKey: 'ParentId' })

      this.belongsTo(models.Battle, { foreignKey: { allowNull: false } })
      this.belongsTo(models.User, { foreignKey: { allowNull: false } })

      this.belongsTo(models.Transaction, { foreignKey: { allowNull: false } })
      this.belongsTo(models.Transaction, { as: 'WinTransaction' })

      this.addScope('active', function () {
        return {
          include: [{
            model: models.Battle,
            where: {
              startTime: { $gt: new Date() }
            }
          }]
        }
      })

      this.addScope('started', function () {
        return {
          include: [{
            model: models.Battle,
            where: {
              startTime: { $lte: new Date() },
              endTime: { $gt: new Date() }
            }
          }]
        }
      })

      this.addScope('finished', function () {
        return {
          include: [{
            model: models.Battle,
            where: {
              endTime: { $lte: new Date() }
            }
          }]
        }
      })
    }
  },

  instanceMethods: {
    getOdds: function () {
      return this
        .getBet({ include: this.Model.associations.Transaction })
        .then((bets) =>
          bets.reduce(([win, lose], bet) =>
            (bet.choice === 1)
              ? [win - bet.Transaction.amount, lose]
              : [win, lose - bet.Transaction.amount],
            [0, 0]))
    },

    getAmount: function () {
      return this
        .getTransaction()
        .then((t) => -t.amount)
    },

    updateResult: function (result, t) {
      // TODO: Distribute money
      const r = 1 + (this.choice !== result)
      return this
        .update({ result: result }, { transaction: t })
        .then(() => this.getBet())
        .then((bets) => bets.map((b) => b.updateResult(r, t)))
        .then(_.flatMap)
        .then((updates) => Promise.all(updates))
        .then(() => true)
    }
  }
})

