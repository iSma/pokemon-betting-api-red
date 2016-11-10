'use strict';

const Sequelize = require('sequelize');

module.exports.register = (server, options, next) => {
  const db = new Sequelize(
    process.env.POSTGRES_DATABSE,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD, {
      host: process.env.POSTGRES_HOST,
      dialect: 'postgres',
      port:5432
    });

  const User = db.import('./user.js');
  const Bet = db.import('./bet.js');
  const Transaction = db.import('./transaction.js');

  User.hasMany(Bet);
  Bet.hasOne(Bet);

  Transaction.belongsTo(Bet);
  User.hasMany(Transaction);

  Transaction.getMoney = function(userId) {
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

  server.app.DB = {
    db: db,
    User: User,
    Bet: Bet,
    Transaction: Transaction,
  }

  db.sync(/*{ force: true }*/).then(() => next());
}

module.exports.register.attributes = {
  name: 'models',
  version: '1.0.0'
};

