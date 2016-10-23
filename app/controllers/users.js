'use strict';

const Joi = require('joi');
var User = require('../database.js').User;

module.exports.register = (server, options, next) => {

  // GET /users
  server.route({
    method: 'GET',
    path: '/users',
    handler: (req, reply) => {
      User.findAll({
        attributes:['name', 'mail']
      }).then(function(users){
        reply(users).code(200);
      })
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
  server.route({
  method: 'POST',
    path: '/users',
    handler: (req, reply) => {
      User.create({
        name: req.payload.name,
        mail: req.payload.mail,
        password: req.payload.password,
        money: 0
        }).then(function(new_user){
          reply(new_user).code(201);
        })
    },
    config: {
        tags: ['api'],
        description: 'add a new user',
        validate: {
            payload: {
                name: Joi.string().required(),
                mail: Joi.string().required(),
                password: Joi.string().required()
            }
        },
        plugins: {'hapi-swagger': {responses: {
            201: {
                description: 'Created'
            }
        }}}
    }

  });
  // ...

  return next();
};

module.exports.register.attributes = {
  name: 'users',
  version: '1.0.0'
};
