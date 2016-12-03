'use strict'
const _ = require('lodash')

module.exports = (db, DataTypes) => db.define('Pokemon', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  hp: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  atk: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  def: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  spatk: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  spdef: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  speed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  total: {
    type: DataTypes.VIRTUAL(DataTypes.INTEGER, ['hp', 'atk', 'def', 'spatk', 'spdef', 'speed']),
    get: function () {
      return ['hp', 'atk', 'def', 'spatk', 'spdef', 'speed']
        .map((s) => this[s])
        .reduce((a, b) => a + b)
    }
  }
}, {
  classMethods: {
    associate: function (models) {
    },

    createFromApi: function (api) {
      const pkmn = _(['hp', 'atk', 'def', 'spatk', 'spdef', 'speed'])
        .zipObject(api.stats)
        .merge(api)
        .omit('stats')
        .value()

      return this
        .findOrCreate({
          where: { id: api.id },
          defaults: pkmn
        })
        .then(([pkmn, created]) => pkmn)
    }
  }
})

