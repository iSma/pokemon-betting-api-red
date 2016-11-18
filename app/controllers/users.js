'use strict';

const Joi = require('joi');

module.exports.register = (server, options, next) => {
  const User = server.app.db.User;
  const J = server.app.joi;

  // GET /users
  server.route({
    method: 'GET',
    path: '/users',
    handler: (req, reply) => {
      User.findAll({
        //attributes:['name', 'mail']
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
              schema: Joi.array().items(J.User.joi()) // TODO: verify
            }
          }
        }
      }
    }
  });

  // GET /users/{id}
  server.route({
    method: 'GET',
    path: '/users/{id}',
    handler: (req, reply) => {
      User.findOne({
        where:{
          id: req.params.id
        }
      }).then(function(user){
        if (user == null){
          reply().code(404);
        }else reply(user).code(200);
      })
    },

    config: {
      tags: ['api'],
      description: 'List all users',

      validate: {
        params: {
          id: Joi.number()
        },
        query: {}
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {description: 'Sucess'},
            404: {description: 'user not found'}
          }
        }
      }
    }
  });

  // DELETE /users/{id}
  server.route({
    method: 'DELETE',
    path: '/users/{id}',
    handler: (req, reply) => {
      User.destroy({
        where:{
          id:req.params.id
        }
      }).then(function(n){
        if (n == 1){
          reply().code(200);
        } else {
          reply().code(404);
        }
      })
    },
    config: {
      tags: ['api'],
      description: 'List all users',

      validate: {
        params: {
          id: Joi.number()
        },
        query: {}
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {description: 'Sucess'},
            404: {description: 'user not found'}
          }
        }
      }
    }
  });
  // POST /users
  server.route({
  method: 'POST',
    path: '/users',
    handler: (req, reply) => {
      User.create({
        name: req.payload.name,
        mail: req.payload.mail,
        password: req.payload.password
        }).then(function(new_user){
          reply(new_user['id']).code(201);
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
            201: { description: 'Created'}
        }}}
    }

  });
  // ...

  return next();
};

module.exports.register.attributes = {
  name: 'users',
  version: '1.0.0',
  dependencies: 'sync'
};
