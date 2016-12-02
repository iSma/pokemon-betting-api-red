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
      this.setDataValue('country', val.substring(0, 2).toLowerCase())
    }
  }
}, {
  classMethods: {
    associate: function (models) {
      this.hasMany(models.Team, { foreignKey: { allowNull: false } })
    }
  }
})

