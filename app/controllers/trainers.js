'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  const { Trainer } = server.app.db.models
  const J = server.app.joi

  // Routes covered in this module:
  // - /trainers
  //  + GET: list of trainers
  //
  // - /trainers/{id}
  //  + GET: info about given trainer
  //
  // - /trainers/{id}/battles
  //  TODO+ GET: list of battles this trainer is participating in
  //
  // - /trainers/{id}/stats
  //  + GET

  // GET /trainers
  server.route({
    method: 'GET',
    path: '/trainers',
    handler: (req, reply) => {
      // TODO: limit/offset
      Trainer
        .findAll()
        .then(reply)
    },

    config: {
      tags: ['api'],
      description: 'List all trainers',

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(J.Trainer.joi())
            }
          }
        }
      }
    }
  })

  // GET /trainers/{id}
  server.route({
    method: 'GET',
    path: '/trainers/{id}',
    handler: (req, reply) => {
      Trainer
        .findById(req.params.id)
        .then((trainer) => Trainer.check404(trainer))
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Get a trainer',
      validate: {
        params: {
          id: J.ID.required()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: J.Trainer.joi()
            },
            404: {
              description: 'Trainer not found',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  // GET /trainers/{id}/stats
  server.route({
    method: 'GET',
    path: '/trainers/{id}/stats',
    handler: (req, reply) => {
      Trainer
        .findById(req.params.id)
        .then((trainer) => Trainer.check404(trainer))
        .then((trainer) => trainer.getStats())
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Get statistics on a trainer',
      validate: {
        params: {
          id: J.ID.required()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.object() // TODO
            },
            404: {
              description: 'Trainer not found',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  return next()
}

module.exports.register.attributes = {
  name: 'trainers',
  version: '1.0.0',
  dependencies: 'sync'
}

