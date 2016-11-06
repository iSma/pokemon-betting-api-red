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
  const Event = db.import('./event.js');
  const Transaction = db.import('./transaction.js');

  User.hasMany(Event);
  Event.hasOne(Event);

  Transaction.belongsTo(Event);
  User.hasMany(Transaction);

  server.app.DB = {
    db: db,
    User: User,
    Event: Event,
    Transaction: Transaction,
  }

  db.sync(/*{ force: true }*/).then(() => next());
}

module.exports.register.attributes = {
  name: 'models',
  version: '1.0.0'
};

