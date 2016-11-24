'use strict'

module.exports = (db, DataTypes) => db.define('Trainer', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  gender: {
    type: DataTypes.ENUM,
    values: ['male', 'female'],
    allowNull: false
  },

  country: {
    type: DataTypes.STRING(2),
    validate: { isLowercase: true },
    len: 2,
    allowNull: false,
    set: function (val) {
      this.setDataValue('country', val.toLowerCase())
    }
  }
}, {
  classMethods: {
    associate: function (models) {
      this.hasMany(models.Battle, {as: 'Team1'})
      this.hasMany(models.Battle, {as: 'Team2'})
    }
  }
})

