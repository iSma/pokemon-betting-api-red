'use strict';
const _ = require('lodash');

const Joi = require('joi');
var Transaction = require('../database.js').Transaction;
var User = require('../database.js').User;


module.exports.register = (server, options, next) => {
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
			let new_transaction = {
				amount: req.payload.amount,
				UserId: req.payload.userId,
			};
			Transaction.create(new_transaction).then((new_transaction) => {
				reply(new_transaction.id).code(201)
			}).catch((error) => {
				reply('transaction not created').code(404);
			})

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

			Transaction.sum('amount', {
				where:{
					UserId: req.params.id
				}}).then((amount) => {
					console.log(amount);
					if (!isNaN(amount)){
                    	reply(amount).code(200);
                	}else{
                		console.log('tets');
                		User.findOne({
        					where:{
          					id: req.params.id
          				}}).then((user)=> {
          					if (user !== null)
          					reply(0).code(200);
          					else reply().code(404);
          				})
                	}
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
  version: '1.0.0'
};