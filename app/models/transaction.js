'use strict';

module.exports = (db, DataTypes) => db.define('Transaction', {
  amount: {
    type: DataTypes.INTEGER
  },
});

