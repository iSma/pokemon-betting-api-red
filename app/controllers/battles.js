const _ = require('lodash');

const request = require('request-json');
const client = request.createClient('http://pokemon-battle.bid/api/v1/');
const Joi = require('joi');

module.exports.register = (server, options, next) => {
  // TODO: Extract API URL to global variable
  const client = request.createClient('http://pokemon-battle.bid/api/v1/');

  // Routes covered in this module:
  // - /battles
  //  + GET: list of battles (default: battles that can still be bet on)
  //
  // - /battles/{id}
  //  TODO+ GET: info about given battle
  //
  // - /battles/{id}/bets
  //  TODO+ GET: list of bets placed on this battle
  //  TODO+ POST: place a bet on this battle

  server.route({
    method: 'GET',
    path: '/battles',
    handler: (req, reply) => {
      let response = [];
      // TODO: add options to retrieve past battles, etc.
      // TODO: transform battles (remove superfluous info, e.g. location)
      // TODO: get all battles with limit/offset
      client.get(`battles/?limit=100&is_finished=false`).then((battles) => {
        const now = new Date();
        const response = battles.body
          .filter((battle) => Date.parse(battle.start_time) < now)

        reply(response).code(200);
      })
    },

    config: {
      tags: ['api'],
      description: 'list upcoming battles',
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

  return next();
};

module.exports.register.attributes = {
  name: 'battles',
  version: '1.0.0',
  dependencies: 'sync'
};

