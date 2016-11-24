'use strict'

module.exports = (db, DataTypes) => db.define('Battle', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },

  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },

  endTime: {
    type: DataTypes.DATE,
    allowNull: false
  },

  active: {
    type: DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['startTime']),
    get: function () {
      const now = new Date()
      return this.startTime > now
    }
  },

  started: {
    type: DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['startTime']),
    get: function () {
      const now = new Date()
      return this.startTime <= now && this.endTime > now
    }
  },

  finished: {
    type: DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['endTime']),
    get: function () {
      const now = new Date()
      return this.endTime <= now
    }
  }

}, {
  classMethods: {
    associate: function (models) {
      this.hasMany(models.Bet, {foreignKey: {allowNull: false}})

      this.addScope('active', function () {
        return {
          where: {
            startTime: { $gt: new Date() }
          }
        }
      })

      this.addScope('started', function () {
        return {
          where: {
            startTime: { $lte: new Date() },
            endTime: { $gt: new Date() }
          }
        }
      })

      this.addScope('finished', function () {
        return {
          where: {
            endTime: { $lte: new Date() }
          }
        }
      })
    }
  }
})

