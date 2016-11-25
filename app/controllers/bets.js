'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  const { Bet, User } = server.app.db
  const J = server.app.joi

  // Routes covered in this module:
  // - /bets
  //  + GET: list of bets (default: bets that can still be bet on)
  // - /bets/{id}
  //  + GET: info about given bet
  //  TODO+ PATCH/PUT?
  //  TODO+ DELETE?
  // - /bets/{id}/bets
  //  + GET: list of sub-bets
  //  + POST: place a bet on this bet
  // - /bets/{id}/odds
  //  + GET: odds on bet

  server.route({
    method: 'GET',
    path: '/bets',
    handler: (req, reply) => {
      // TODO: get all battles with limit/offset
      Bet
        .scope(req.query.status)
        .findAll()
        .then((bets) => reply(bets).code(200))
    },

    config: {
      tags: ['api'],
      description: 'List all bets',
      validate: {
        query: {
          status: Joi.string()
            .valid(['active', 'started', 'finished'])
            .default('active')
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(J.Bet.joi()) // TODO: add relations
            }
          }
        }
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/bets/{id}',
    handler: (req, reply) => {
      Bet
        .findById(req.params.id)
        .then((bet) => Bet.check404(bet))
        .then((bet) => reply(bet).code(200))
        .catch((err) => reply(err).code(err.code))
    },

    config: {
      tags: ['api'],
      description: 'Get a bet',
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
              schema: J.Bet.joi() // TODO: add relations
            },
            404: {
              description: 'Bet not found',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/bets/{id}/bets',
    handler: (req, reply) => {
      Bet
        .findById(req.params.id)
        .then((bet) => Bet.check404(bet))
        .then((bet) => bet.getBets())
        .then((bets) => reply(bets).code(200))
        .catch((err) => reply(err).code(err.code))
    },

    config: {
      tags: ['api'],
      description: 'List all bets made on this bet',
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
              schema: Joi.array().items(J.Bet.joi()) // TODO: add relations
            },
            404: {
              description: 'Bet not found',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  server.route({
    method: 'POST',
    path: '/bets/{id}/bets',
    handler: (req, reply) => {
      Promise.all([
        User.findById(token.id).then((user) => User.check404(user)),
        Bet.findById(req.params.id).then((bet) => Bet.check404(bet))
      ])
        .then(([user, bet]) => user.placeBet(bet, req.payload.amount, req.payload.choice))
        .then((bet) => reply(bet).code(200))
        .catch((err) => reply(err).code(err.code))
    },

    config: {
      tags: ['api'],
      description: 'Place a bet on this bet',
      validate: {
        payload: {
          amount: Joi.number().positive().required(),
          choice: Joi.number().min(1).max(2).required()
        }
      },

      plugins: {'hapi-swagger': {responses: {
        201: {
          description: 'New bet created'
        },
        402: {
          description: 'Insufficient funds'
        },
        418: {
          description: 'Battle has already started'
        },
        404: {
          description: 'Bet not found'
        }
      }}}
    }
  })

  server.route({
    method: 'GET',
    path: '/bets/{id}/odds',
    handler: (req, reply) => {
      Bet
        .findById(req.params.id)
        .then((bet) => Bet.check404(bet))
        .then((bet) => bet.getOdds())
        .then((odds) => reply(odds).code(200))
        .catch((err) => reply(err).code(err.code))
    },

    config: {
      tags: ['api'],
      description: 'Get odds on a bet',
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
              schema: Joi.array().items(Joi.number()).length(2)
            },
            404: {
              description: 'Bet not found',
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
  name: 'bets',
  version: '1.0.0',
  dependencies: 'sync'
}

