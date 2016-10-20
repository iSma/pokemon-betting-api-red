'use strict';

const Joi = require('joi');

module.exports.register = (server, options, next) => {

  // GET /users
  server.route({
    method: 'GET',
    path: '/users',
    handler: (req, reply) => {
      reply(["Ash", "Misty", "Brock"]).code(200);
    },

    config: {
      tags: ['api'],
      description: 'List all users',

      validate: {
        params: {},
        query: {}
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(Joi.string())
            }
          }
        }
      }
    }
  });

  // GET /users/{id}
  // POST /users
  // ...

  return next();
};

module.exports.register.attributes = {
  name: 'users',
  version: '1.0.0'
};
