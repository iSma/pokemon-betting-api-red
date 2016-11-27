'use strict'

module.exports = (db, DataTypes) => db.define('Transaction', {
  amount: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  }

}, {
  classMethods: {
    associate: function (models) {
      this.hasOne(models.Bet, { foreignKey: { allowNull: false } })
      this.hasOne(models.Bet, { as: 'WinTransaction' })

      this.belongsTo(models.User, { foreignKey: { allowNull: false } })
    }
  }
})

