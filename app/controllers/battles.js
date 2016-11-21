'use strict';
const _ = require('lodash');
const request = require('request-json');
const Joi = require('joi');

module.exports.register = (server, options, next) => {
  const {Bet, Battle} = server.app.db;
  const J = server.app.joi;

  // Routes covered in this module:
  // - /battles
  //  + GET: list of battles (default: battles that can still be bet on)
  //
  // - /battles/{id}
  //  + GET: info about given battle
  //
  // - /battles/{id}/bets
  //  + GET: list of bets placed on this battle
  //  TODO+ POST: place a bet on this battle

  server.route({
    method: 'GET',
    path: '/battles',
    handler: (req, reply) => {
      // TODO: get all battles with limit/offset
      Battle.getAll(req.query)
        .then((battles) => reply(battles).code(200));
    },

    config: {
      tags: ['api'],
      description: 'List upcoming or past battles',
      validate: {
        query: {
          isStarted: Joi.boolean().default(false),
          isFinished: Joi.boolean().default(false),
        }
      },
      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(Joi.string()) // TODO: replicate schema from remote API
            }
          }
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/battles/{id}',
    handler: (req, reply) => {
      Battle.get(req.params.id)
        .then((battle) => reply(battles).code(200))
        .catch((err) => reply(err).code(err.code));
    },

    config: {
      tags: ['api'],
      description: 'Get a battle',
      validate: {
        params: {
          id: Joi.number().integer().positive().required()
        }
      },
      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array() // TODO: replicate schema from remote API
            }
          }
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/battles/{id}/bets',
    handler: (req, reply) => {
      Battle.get(req.params.id)
        .then((battle) => battle.getBets())
        .then((bets) => reply(bets).code(200))
        .catch((err) => reply(err).code(err.code));
    },

    config: {
      tags: ['api'],
      description: 'List bets on a battle',
      validate: {
        params: {
          id: Joi.number().integer().positive().required()
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

  return next();
};

module.exports.register.attributes = {
  name: 'battles',
  version: '1.0.0',
  dependencies: 'sync'
};

