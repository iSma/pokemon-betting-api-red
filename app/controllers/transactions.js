'use strict';
const _ = require('lodash');

const Joi = require('joi');


module.exports.register = (server, options, next) => {
  var {User, Transaction} = server.app.DB;

	server.route({
		method: 'GET',
		path: '/transactions',
		handler: (req, reply) => {

			Transaction.findAll().then((transactions) => {
                    reply(transactions).code(200);
            });
		},
        config: {
            tags: ['api'],
            description: 'list all transaction',
            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Joi.array().items(Joi.string()) //to do joi sequelize
                        }
                    }
                }
            }
          }
	});

	server.route({
		method: 'POST',
		path: '/transactions',
		handler: (req, reply) => {
      const amount = req.payload.amount;
      const UserId = req.payload.userId;

      Transaction.getMoney(UserId).then((money) => {
        if (money === null)
          reply(`User ${UserId} does not exist.`).code(404);
        else if (amount + money < 0)
          reply(`Not enough money (available funds = ${money})`).code(402);
        else
          Transaction.create({amount, UserId})
          .then((t) => reply(t).code(201))
          .catch((err) => reply(err).code(500));
      });
    },
        config: {
            tags: ['api'],
            description: 'make a new transaction',
            validate: {
            	payload: {
            		amount: Joi.number().required(),
            		userId: Joi.number().integer().required()
            	}
            },
            plugins: {
                'hapi-swagger': {
                    'responses': {
                        201: {
                            description: 'Success',
                            schema: Joi.string()//to do joi sequelize
                        },
                        404: {
                        	description: 'use id not found'
                        }
                    }
                }
            }
          }
	});

	server.route({
		method: 'GET',
		path: '/balance/{id}/',
    handler: (req, reply) => {
      Transaction.getMoney(req.params.id)
        .then((money) => {
          if (money === null)
            reply().code(404);
          else
            reply(money).code(200);
        });
    },
        config: {
            tags: ['api'],
            description: 'list balance of an user',
            validate: {
                params: {
                    id: Joi.number().integer().required()
                }
            },
            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Joi.number() //to do joi sequelize
                        },
                        404: {
                        	description: 'id not found'
                        }
                    }
                }
            }
          }
	});


	return next();
};

module.exports.register.attributes = {
  name: 'transactions',
  version: '1.0.0',
  dependencies: 'sync'
};
