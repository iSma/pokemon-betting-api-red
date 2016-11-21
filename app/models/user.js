'use strict';

module.exports = (db, DataTypes) => db.define('User', {
  name: {
    type: DataTypes.STRING
  },
  mail: {
    type: DataTypes.STRING
  },
  password: {
    type: DataTypes.STRING
  },
  money: {
    type: DataTypes.FLOAT
  }
}, {
  classMethods: {
    associate: function(models) {
      this.hasMany(models.Bet);
      this.hasMany(models.Transaction);
    }
  }
});

