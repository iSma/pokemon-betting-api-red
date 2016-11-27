'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  // GET /login
  server.route({
    method: 'GET',
    path: '/login',
    handler: (req, reply) => {
      reply(req.auth.credentials.next)
    },

    config: {
      tags: ['api'],
      description: 'Refresh session',
      auth: 'jwt',

      validate: {
        query: {
          token: Joi.string()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.string()
            },
            401: {
              decription: 'Unauthorized',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  // POST /login
  server.route({
    method: 'POST',
    path: '/login',
    handler: (req, reply) => {
      server.app
        .login(req.payload.name, req.payload.pass)
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Log in',
      validate: {
        payload: {
          name: Joi.string().min(3).required(),
          pass: Joi.string().min(1).required()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.string()
            },
            401: {
              decription: 'Unauthorized',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  // DELETE /login
  server.route({
    method: 'DELETE',
    path: '/login',
    handler: (req, reply) => {
      server.app.logout(req.auth.credentials.sub)
      reply(req.auth.credentials)
    },

    config: {
      tags: ['api'],
      description: 'Delete session (log out)',
      auth: 'jwt',

      validate: {
        query: {
          token: Joi.string()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.string()
            },
            401: {
              decription: 'Unauthorized',
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
  name: 'session',
  version: '1.0.0',
  dependencies: 'sync'
}

