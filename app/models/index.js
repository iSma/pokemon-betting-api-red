'use strict';

const Sequelize = require('sequelize');
const JoiSequelize = require('joi-sequelize');

module.exports.register = (server, options, next) => {
  const db = new Sequelize(
    process.env.POSTGRES_DATABSE,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD, {
      host: process.env.POSTGRES_HOST,
      dialect: 'postgres',
      port:5432
    });

  server.app.db = {};
  server.app.joi = {};

  ['user', 'bet', 'transaction']
    .map((name) => `./${name}.js`)
    .forEach((file) => {
      const model = db.import(file);
      const joi = new JoiSequelize(require(file));

      server.app.db[model.name] = model;
      server.app.joi[model.name] = joi;
    });

  ['battle', 'trainer']
    .map((name) => `./${name}.js`)
    .forEach((file) => {
      const model = require(file);
      server.app.db[model.name] = model;
    });

  for (const model in server.app.db)
    server.app.db[model].associate(server.app.db);

  db.sync(/*{ force: true }*/).then(() => next());
}

module.exports.register.attributes = {
  name: 'models',
  version: '1.0.0'
};

