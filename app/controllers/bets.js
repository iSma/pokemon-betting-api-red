'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  const { Bet, User } = server.app.db.models
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

  // GET /bets
  server.route({
    method: 'GET',
    path: '/bets',
    handler: (req, reply) => {
      // TODO: get all battles with limit/offset
      Bet
        .scope(req.query.status)
        .findAll()
        .then(reply)
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

  // GET /bets/{id}
  server.route({
    method: 'GET',
    path: '/bets/{id}',
    handler: (req, reply) => {
      Bet
        .findById(req.params.id)
        .then((bet) => Bet.check404(bet))
        .then(reply)
        .catch(reply)
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

  // GET /bets/{id}/bets
  server.route({
    method: 'GET',
    path: '/bets/{id}/bets',
    handler: (req, reply) => {
      Bet
        .findById(req.params.id)
        .then((bet) => Bet.check404(bet))
        .then((bet) => bet.getBets())
        .then(reply)
        .catch(reply)
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

  // POST /bets/{id}/bets
  server.route({
    method: 'POST',
    path: '/bets/{id}/bets',
    handler: (req, reply) => {
      Promise.all([
        User.findById(req.auth.credentials.id).then((user) => User.check404(user)),
        Bet.findById(req.params.id).then((bet) => Bet.check404(bet))
      ])
        .then(([user, bet]) => user.placeBet(bet, req.payload.amount, req.payload.choice))
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Place a bet on this bet',
      validate: {
        params: {
          id: J.ID.required()
        },
        payload: {
          amount: Joi.number().positive().required(),
          choice: Joi.number().min(1).max(2).required()
        },
        query: {
          token: Joi.string()
        }
      },

      plugins: {
        'hapi-swagger': {
          responses: {
            201: {
              description: 'New bet created'
            },
            402: {
              description: 'Insufficient funds'
            },
            404: {
              description: 'Bet not found'
            },
            410: {
              description: 'Battle has already started'
            }
          }
        }
      }
    }
  })

  // GET /bets/{id}/odds
  server.route({
    method: 'GET',
    path: '/bets/{id}/odds',
    handler: (req, reply) => {
      Bet
        .findById(req.params.id)
        .then((bet) => Bet.check404(bet))
        .then((bet) => bet.getOdds())
        .then(reply)
        .catch(reply)
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

