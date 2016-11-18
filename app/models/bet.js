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

    // TODO: move to instance method
    getOdd: function( type, id, amount = 0 ) {
      let query = {where:{}};
      console.log(type);
      if (type == "battle"){
        query.where.battle = id;
      }else if (type == "bet"){
        query.where.BetId = id;
      }
      query.where.choice = true;
      const p =
        this
        .sum('amount', query).then( win => {
          query.where.choice = false;
          return Bet.sum('amount', query).then( loose =>{
            if (isNaN(win)){
              win = 0;
            };
            if (isNaN(loose)){
              loose = 0;
            };
            if(amount == 0 ){
              console.log(win,loose);
              if (win + loose == 0) return [1,1];
              else return [win/(win+loose),loose/(win+loose)];
            }else{
              var g_win = (loose + win + amount)*(amount/(win+amount))/amount;
              var g_loose = (loose + win + amount)*(amount/(loose+amount))/amount;
              console.log(g_win,g_loose);
              return [g_win, g_loose];
            }
          })
        });
      return Promise.resolve(p);
    }
  }
});

