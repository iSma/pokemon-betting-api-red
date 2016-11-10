'use strict';

module.exports = (db, DataTypes) => db.define('Bet', {
  date: {
    type: DataTypes.DATE
  },

  // If this is a 1st order bet, battle is the ID (from pokemon-battle.bid) on
  // which it is based. For higher-order bets, this field is NULL.
  battle: {
    type: DataTypes.INTEGER
  },

  amount: {
    type: DataTypes.INTEGER
  },

  // The result the user expects from this bet:
  // "true" means Trainer1 wins the battle OR the parent bet was correct.
  choice: {
    type: DataTypes.BOOLEAN
  },

  // Same convention as choice. "true" doesn't mean the better was right!
  // Instead, it gives the result of the parent bet/battle. The better was
  // right if choice == result.
  result: {
    type: DataTypes.BOOLEAN
  }
});

