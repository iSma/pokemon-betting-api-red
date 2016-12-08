'use strict'

const Sequelize = require('sequelize')
const Joi = require('joi')
const JoiSequelize = require('joi-sequelize')
const Boom = require('boom')

module.exports.register = (server, options, next) => {
  const config = server.app.config.db
  const db = new Sequelize(
    config.db,
    config.user,
    config.pass,
    {
      host: config.host,
      dialect: 'postgres',
      port: config.port,
      define: {
        timestamps: false,
        classMethods: {
          // Checks if an object is not null, throws a 404 error otherwise.
          // Intended to be used in a promise chain, right after .findById(id)
          check404: function (object) {
            return (object)
              ? Promise.resolve(object)
              : Promise.reject(Boom.notFound(`${this.name} not found`))
          }
        }
      }
    })

  Joi.id = () => Joi.number().integer().positive()
  server.app.db = db
  server.app.db.app = server.app
  server.app.Joi = Joi

  require('fs')
    .readdirSync('./models')
    .filter((file) => file !== 'index.js')
    .forEach((file) => db.import(file))

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
  version: '1.0.0',
  dependencies: 'config'
}

