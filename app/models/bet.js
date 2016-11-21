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
}, {
  classMethods: {
    associate: function(models) {
      this.hasOne(this);
    },

    get: function(id) {
      return this
        .findOne({where: {id: id}})
        .then((bet) => {
          if (bet === null)
            throw {
              err: `Bet ${id} not found.`,
              code: 404
            };
          else
            return bet;
        });
    },

    getAll: function(query) {
      query = query || {};
      query.isFinished = query.isFinished || false;
      query.isStarted = query.isStarted || false;

      const where = {}; // TODO
      return this.findAll({where: where})
    }
  },

  instanceMethods: {
    getBets: function() {
      return this.$Model
        .findAll({where: {BetId: this.id}});
    },

    getOdds: function() {
      return this
        .getBets()
        .then((bets) => bets.reduce(([win, lose], bet) => {
          if (bet.choice)
            return [win+bet.amount, lose];
          else
            return [win, lose+bet.amount];
        }), [0, 0]);
    }
  }
});

