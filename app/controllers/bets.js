'use strict';
const _ = require('lodash');

const request = require('request-json');
const client = request.createClient('http://pokemon-battle.bid/api/v1/');
const Joi = require('joi');

module.exports.register = (server, options, next) => {
  // TODO: Extract API URL to global variable
  const client = request.createClient('http://pokemon-battle.bid/api/v1/');
  const {Bet, Transaction} = server.app.db;
  const J = server.app.joi;

  // Routes covered in this module:
  // - /bets
  //  + GET: list of bets (default: bets that can still be bet on)
  // - /bets/{id}
  //  + GET: info about given bet
  //  TODO+ PATCH/PUT?
  //  TODO+ DELETE?
  // - /bets/{id}/bets
  //  + GET: list of sub-bets
  //  TODO+ POST: place a bet on this bet

  server.route({
    method: 'GET',
    path: '/bets',
    handler: (req, reply) => {
      Bet.getAll(req.query)
        .then((bets) => reply(bets).code(200));
    },

    config: {
      tags: ['api'],
      description: 'List all bets',
      validate: {
        query: {
          isFinished: Joi.boolean().default(false),
          isStarted: Joi.boolean().default(false).
          limit: Joi.number().integer().positive().max(100).default(20)
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
  });

  server.route({
    method: 'GET',
    path: '/bets/{id}',
    handler: (req, reply) => {
      Bet.get(req.params.id)
        .then((bet) => reply(bet).code(200))
        .catch((err) => reply(err).code(err.code));
    },

    config: {
      tags: ['api'],
      description: 'Get a bet',
      validate: {
        params: {
          id: Joi.number().integer().positive().required()
        }
      },
      plugins: {
        'hapi-swagger': {
          'responses': {
            // TODO: add 404
            200: {
              description: 'Success',
              schema: J.Bet.joi() // TODO: add relations
            }
          }
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/bets/{id}/bets',
    handler: (req, reply) => {
      Bet.get(req.params.id)
        .then((bet) => bet.getBets())
        .then((bets) => reply(bets).code(200))
        .catch((err) => reply(err).code(err.code));
    },

    config: {
      tags: ['api'],
      description: 'List all bets made on a certain bet',
      validate: {
        params: {
          id: Joi.number().integer().positive().required()
        }
      },
      plugins: {
        'hapi-swagger': {
          'responses': {
            // TODO: add 404
            200: {
              description: 'Success',
              schema: Joi.array().items(J.Bet.joi()) // TODO: add relations
            }
          }
        }
      }
    }
  });

  // TODO: move to POST /battle|bets/{id}/bets
  server.route({
    method: 'POST',
    path: '/bets',
    handler: (req, reply) => {
      let bet = {
        amount: req.payload.amount,
        choice: req.payload.choice,
        UserId: req.payload.userId
      };

      if(req.payload.bet == 'battle')
        bet.battle = req.payload.betId
      else if (req.payload.bet == 'bet')
        bet.BetId = req.payload.betId
      else {
        reply("'bet' parameter must be 'battle' or 'bet'.").code(400);
        return;
      }

      Transaction.getMoney(bet.UserId)
        .then((money) => {
          if (money === null)
            return Promise.reject({
              err: `User ${bet.UserId} does not exist.`,
              code: 404
            });
          else if (money - bet.amount < 0)
            return Promise.reject({
              err: `Not enough money (available funds = ${money})`,
              code: 402
            });
          else
            return bet;
        })
        .then((bet) => {
          if (bet.battle !== undefined)
            // TODO: check if battle exists
            // TODO: check if battle is not started
            return Promise.resolve(bet);
          else
            // TODO: check if bet has no result.
            return Promise.resolve(bet);
        })
        .then((bet) => Bet.create(bet).catch((err) => {
          return Promise.reject({
            err: `Bet ${bet.BetId} does not exist.`,
            code: 404
          });
        }))
        .then((bet) => {
          return Transaction.create({amount: -bet.amount, UserId: bet.UserId})
            .then((t) => bet)
            .catch((err) => reply(err).code(500));
        })
        .then((bet) => {
          reply(bet).code(201);
        })
        .catch((err) => {
          console.log(err);
          reply(err.err).code(err.code)
        });
    },
    config: {
      tags: ['api'],
      description: 'add a new bet',
      validate: {
        payload: {
          userId: Joi.number().integer().required(),
          bet: Joi.string().required(),
          betId: Joi.number().integer().required(),
          amount: Joi.number().required(), // TODO: Check > 0
          choice: Joi.boolean().required(),

        }
      },
      plugins: {'hapi-swagger': {responses: {
        201: { description: 'new bet Created'},
        400: {description: 'bad type'},
        404: {description: 'id not found'}
      }}}
    }

  });

  // TODO???: move to GET /battles/{id} (as property of battle object)
  server.route({
    method: 'GET',
    path: '/battles/{id}/odd',
    handler: (req, reply) => {
      //TODO check if battle exist
      Bet.getOdd('battle', req.params.id,req.query.amount).then( odd =>{
        reply(odd).code(200);
      });
    },

    config: {
      tags: ['api'],
      description: 'get odd on a certain bet on a battle',
      validate: {
        params: {
          id: Joi.number().integer().required()
        },
        query: {
          amount: Joi.number().integer()
        }

      },
      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(Joi.number())//tod joi sequelize
            }
          }
        }
      }
    }
  });

  // TODO???: move to GET /bets/{id} (as property of bet object)
  server.route({
    method: 'GET',
    path: '/bets/{id}/odd',
    handler: (req, reply) => {
      //TODO check if bet exist
      Bet.getOdd('bet', req.params.id,req.query.amount).then( odd =>{
        reply(odd).code(200);
      });
    },

    config: {
      tags: ['api'],
      description: 'get odd on a certain bet on another bet',
      validate: {
        params: {
          id: Joi.number().integer().required()
        },
        query: {
          amount: Joi.number().integer()
        }

      },
      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(Joi.number())//tod joi sequelize
            }
          }
        }
      }
    }
  });


  return next();
};

module.exports.register.attributes = {
  name: 'bets',
  version: '1.0.0',
  dependencies: 'sync'
};

