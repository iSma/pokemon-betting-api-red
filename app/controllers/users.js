'use strict'
const Boom = require('boom')
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  const { User } = server.app.db.models
  const J = server.app.joi

  // Routes covered in this module:
  // - /users
  //  + GET?: list users
  //  + POST: create user account
  // - /users/{id}
  //  + GET: see profile
  //  + DELETE
  //  + PATCH: Update profile
  // - /users/{id}/bets
  //  TODO+ GET
  // - /users/{id}/stats
  //  TODO+ GET
  // - /users/{id}/transactions (only visible to user)
  //  + GET
  //  + POST
  // - /users/{id}/balance (only visible to user)
  //  + GET

  const checkPermissions = (req) =>
    req.params.id === req.auth.credentials.sub
    ? User.findById(req.params.id)
    : Promise.reject(Boom.unauthorized())

  // GET /users
  server.route({
    method: 'GET',
    path: '/users',
    handler: (req, reply) => {
      User
        .findAll({ attributes: ['name'] })
        .then(reply)
    },

    config: {
      tags: ['api'],
      description: 'List all users',

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(J.User.joi()) // TODO: verify
            }
          }
        }
      }
    }
  })

  // GET /users/{id}
  server.route({
    method: 'GET',
    path: '/users/{id}',
    handler: (req, reply) => {
      User
        .findById(req.params.id, { attributes: ['name'] })
        .then((user) => User.check404(user))
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Get a user',

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
              schema: J.User.joi()
            },
            404: {
              description: 'User not found',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  // DELETE /users/{id}
  server.route({
    method: 'DELETE',
    path: '/users/{id}',
    handler: (req, reply) => {
      // TODO: what to do with user's bets???
      checkPermissions(req)
        .then((user) => User.check404(user))
        .then((user) => user.destroy())
        .then(reply) // TODO: log out
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Delete user account',
      auth: 'jwt',

      validate: {
        params: {
          id: J.ID.required()
        },
        query: {
          token: Joi.string()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success'
            },
            404: {
              description: 'User not found',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  // POST /users
  server.route({
    method: 'POST',
    path: '/users',
    handler: (req, reply) => {
      User
        .create({
          name: req.payload.name,
          mail: req.payload.mail,
          pass: req.payload.pass
        })
        .then((user) => reply({ id: user.id }).code(201))
        .catch((err) =>
          err.name !== 'SequelizeUniqueConstraintError'
            ? Promise.reject(err) // Unknown error
            : Boom.badData(err.errors.map((e) =>
              `${e.path} "${e.value}" already exists`).join('\n'))
            )
        .then(reply)
    },

    config: {
      tags: ['api'],
      description: 'add a new user',
      validate: {
        payload: {
          name: Joi.string().min(3).required(),
          mail: Joi.string().email().required(),
          pass: Joi.string().min(1).required()
        }
      },

      plugins: {
        'hapi-swagger': {
          responses: {
            201: {
              description: 'User created',
              schema: Joi.object({ id: J.ID })
            },
            422: {
              description: 'User name or mail already exists',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  // GET /users/{id}/balance
  server.route({
    method: 'GET',
    path: '/users/{id}/balance',
    handler: (req, reply) => {
      checkPermissions(req)
        .then((user) => User.check404(user))
        .then((user) => user.getMoney())
        .then((balance) => ({ balance }))
        .then(reply) // TODO: send new token
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Get available funds',
      auth: 'jwt',

      validate: {
        params: {
          id: J.ID.required()
        },
        query: {
          token: Joi.string()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.number()
            },
            404: {
              description: 'User not found'
            }
          }
        }
      }
    }
  })

  // GET /users/{id}/transactions
  server.route({
    method: 'GET',
    path: '/users/{id}/transactions',
    handler: (req, reply) => {
      checkPermissions(req)
        .then((user) => User.check404(user))
        .then((user) => user.getTransactions())
        .then(reply) // TODO: send new token
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Get available funds',
      auth: 'jwt',

      validate: {
        params: {
          id: J.ID.required()
        },
        query: {
          token: Joi.string()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(J.Transaction.joi())
            },
            404: {
              description: 'User not found'
            }
          }
        }
      }
    }
  })

  // POST /users/{id}/transactions
  server.route({
    method: 'POST',
    path: '/users/{id}/transactions',
    handler: (req, reply) => {
      checkPermissions(req)
        .then((user) => User.check404(user))
        .then((user) => user.getMoney().then((money) => [user, money]))
        .then(([user, money]) =>
          money + req.payload.amount >= 0
            ? user.createTransaction({ amount: req.payload.amount })
            .then((transaction) => [money, transaction])
            : Promise.reject(Boom.paymentRequired(`Not enough money (available funds: ${money})`))
        )
        .then(([money, t]) => ({ transaction: t.id, balance: t.amount + money }))
        .then(reply) // TODO: send new token
        .catch(reply)
    },
    config: {
      tags: ['api'],
      description: 'Deposit or withdraw money from user account',
      auth: 'jwt',

      validate: {
        payload: {
          amount: Joi.number().required()
        },
        params: {
          id: J.ID.required()
        },
        query: {
          token: Joi.string()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            201: {
              description: 'Success',
              schema: Joi.object({
                transaction: J.ID,
                balance: Joi.number()
              })
            },
            402: {
              description: 'Insufficient funds'
            },
            404: {
              description: 'User not found'
            }
          }
        }
      }
    }
  })

  return next()
}

module.exports.register.attributes = {
  name: 'users',
  version: '1.0.0',
  dependencies: 'sync'
}

