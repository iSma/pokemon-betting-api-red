'use strict'

const Sequelize = require('sequelize')
const JoiSequelize = require('joi-sequelize')

module.exports.register = (server, options, next) => {
  const db = new Sequelize(
    process.env.POSTGRES_DATABSE,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD, {
      host: process.env.POSTGRES_HOST,
      dialect: 'postgres',
      port: 5432,
      define: {
        timestamps: false
      }
    })

  server.app.db = db
  server.app.joi = {};

  ['battle', 'bet', 'trainer', 'user', 'transaction']
    .map((name) => `./${name}.js`)
    .forEach((file) => {
      const model = db.import(file)
      const joi = new JoiSequelize(require(file))
      server.app.joi[model.name] = joi
    })

  for (const model in db.models) {
    db.models[model].associate(db.models)
  }

  db.sync({ force: true }).then(() => {
    console.log('Database synced')
    return next()
  })
}

module.exports.register.attributes = {
  name: 'models',
  version: '1.0.0'
}

