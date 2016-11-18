'use strict';

module.exports = (db, DataTypes) => db.define('Transaction', {
  amount: {
    type: DataTypes.INTEGER
  },
}, {
  classMethods: {
    associate: function(models) {
      this.belongsTo(models.Bet);
    },

    // TODO: Move this to user instance method
    getMoney: function(userId) {
      const p =
        this
        .sum('amount', { where:{ UserId: userId }})
        .then((amount) => {
          if (!isNaN(amount))
            return amount;

          return User.findOne({ where:{ id: userId } })
            .then((user)=> {
              if (user !== null) return 0;
              else return null;
            })
        });

      return Promise.resolve(p);
    }
  }
});


