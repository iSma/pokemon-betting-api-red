'use strict'

const Sequelize = require('sequelize')
const Joi = require('joi')
const JoiSequelize = require('joi-sequelize')
const request = require('request-json')

module.exports.register = (server, options, next) => {
  const db = new Sequelize(
    process.env.POSTGRES_DATABSE,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD, {
      host: process.env.POSTGRES_HOST,
      dialect: 'postgres',
      port: 5432,
      define: {
        timestamps: false,
        classMethods: {
          // Checks if an object is not null, throws a 404 error otherwise.
          // Intended to be used in a promise chain, right after .findById(id)
          check404: function (object) {
            return (object)
              ? Promise.resolve(object)
              : Promise.reject({ error: `${this.name} not found`, code: 404 })
          }
        }
      }
    })

  db.client = request.createClient('http://pokemon-battle.bid/api/v1/')

  server.app.db = db
  server.app.joi = {
    ID: Joi.number().integer().positive()
  };

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

  db.sync({ force: false }).then(() => {
    console.log('Database synced')
    return next()
  })
}

module.exports.register.attributes = {
  name: 'models',
  version: '1.0.0'
}

