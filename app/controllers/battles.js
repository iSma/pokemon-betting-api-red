'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  const { Battle, User } = server.app.db.models
  const J = server.app.joi

  // Routes covered in this module:
  // - /battles
  //  + GET: list of battles (default: battles that can still be bet on)
  //
  // - /battles/{id}
  //  + GET: info about given battle
  //
  // - /battles/{id}/bets
  //  + GET: list of bets placed on this battle
  //  + POST: place a bet on this battle
  //
  // - /battles/{id}/odds
  //  + GET: odds on battle

  // GET /battles
  server.route({
    method: 'GET',
    path: '/battles',
    handler: (req, reply) => {
      // TODO: get all battles with limit/offset
      Battle
        .scope(req.query.status)
        .findAll()
        .then(reply)
    },

    config: {
      tags: ['api'],
      description: 'List battles',
      validate: {
        query: {
          status: Joi.string()
            .valid(['active', 'started', 'ended'])
            .default('active')
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(J.Battle.joi())
            }
          }
        }
      }
    }
  })

  // GET /battles/{id}
  server.route({
    method: 'GET',
    path: '/battles/{id}',
    handler: (req, reply) => {
      Battle
        .findById(req.params.id)
        .then((battle) => Battle.check404(battle))
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Get a battle',
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
              schema: J.Battle.joi()
            },
            404: {
              description: 'Battle not found',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  // GET /battles/{id}/bets
  server.route({
    method: 'GET',
    path: '/battles/{id}/bets',
    handler: (req, reply) => {
      Battle
        .findById(req.params.id)
        .then((battle) => Battle.check404(battle))
        .then((battle) => battle.getBets())
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'List bets on a battle',
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
              description: 'Battle not found',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  // POST /battles/{id}/bets
  server.route({
    method: 'POST',
    path: '/battles/{id}/bets',
    handler: (req, reply) => {
      Promise.all([
        User.findById(req.auth.credentials.sub).then((user) => User.check404(user)),
        Battle.findById(req.params.id).then((battle) => Battle.check404(battle))
      ])
        .then(([user, battle]) => user.placeBet(battle, req.payload.amount, req.payload.choice))
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Place a bet on this battle',
      auth: 'jwt',

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
              description: 'Battle not found'
            },
            410: {
              description: 'Battle has already started'
            }
          }
        }
      }
    }
  })

  // GET /battles/{id}/odds
  server.route({
    method: 'GET',
    path: '/battles/{id}/odds',
    handler: (req, reply) => {
      Battle
        .findById(req.params.id)
        .then((battle) => Battle.check404(battle))
        .then((battle) => battle.getOdds())
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Get odds on a battle',
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
              description: 'Battle not found',
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
  name: 'battles',
  version: '1.0.0',
  dependencies: 'sync'
}

