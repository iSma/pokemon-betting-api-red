'use strict'

module.exports = (db, DataTypes) => db.define('Team', {
  index: {
    type: DataTypes.INTEGER,
    allowNull: false
  }

}, {
  indexes: [{
    fields: ['BattleId', 'index'],
    unique: true
  }],

  classMethods: {
    associate: function (models) {
      this.belongsTo(models.Battle, { foreignKey: { allowNull: false } })
      this.belongsTo(models.Trainer, { foreignKey: { allowNull: false } })
    }
  }
})

