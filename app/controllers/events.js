'use strict';
const Lodash = require('lodash');

const Joi = require('joi');
var Event = require('../database.js').Event;


module.exports.register = (server, options, next) => {
	// GET/events

	server.route({
	  	method: 'GET',
    	path: '/events',
    	handler: (req, reply) => {
    		req.query.limit
    		Event.findAll({

    		}).then(function(events){
    			if (req.query.limit === undefined) reply(events).code(200);
    			else reply(Lodash.take(events, req.query.limit)).code(200)
    			
    		})
    	},

    	config: {
    		tags: ['api'],
    		description: 'list all events/bets',
    		validate: {
        		query: {
        			is_finished: Joi.boolean(),
        			limit: Joi.number(),
        		}
        	},
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
        method: 'GET',
        path: '/events/{id}',
        handler: (req, reply) => {
            req.query.limit
            Event.findOne({
                where:{
                    id: req.params.id
                }
            }).then(function(event){
                reply(event).code(200);
                
            })
        },

        config: {
            tags: ['api'],
            description: 'list all events/bets',
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
                            schema: Joi.array().items(Joi.string())//tod joi sequelize
                        }
                    }
                }
            }
          }
    });

    server.route({
        method: 'GET',
        path: '/events/{id}/events',
        handler: (req, reply) => {
            req.query.limit
            Event.findAll({
                where:{
                    EventId: req.params.id
                }
            }).then(function(events){
                reply(events).code(200);
                
            })
        },

        config: {
            tags: ['api'],
            description: 'list all events/bets',
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
                            schema: Joi.array().items(Joi.string())//tod joi sequelize
                        }
                    }
                }
            }
          }
    });

    server.route({
        method: 'POST',
        path: '/events',
        handler: (req, reply) => {
          let new_event = {
          amount: req.payload.amount,
          choice: req.payload.choice,
          UserId: req.payload.userId
          };
          if(req.payload.bet == 'battle'){
            //todo check if battle exist
            new_event.battle = req.payload.betId
          } else if ( req.payload.bet == 'bet'){
            new_event.EventId = req.payload.betId
          } else reply().code(400);
          Event.create(new_event).then(function(new_event){
              reply(new_event['id']).code(201);
            }).catch(function(error){
                reply('event not created').code(404);
            })
        },
        config: {
            tags: ['api'],  
            description: 'add a new event',
            validate: {
                payload: {
                    userId: Joi.number().integer().required(),
                    bet: Joi.string().required(),
                    betId: Joi.number().integer().required(),
                    amount: Joi.number().required(),
                    choice: Joi.boolean().required(),

                }
            },
            plugins: {'hapi-swagger': {responses: {
                201: { description: 'new event Created'},
                400: {description: 'bad type'},
                404: {description: 'id not found'}
            }}}
            }

  });

	return next();

};

module.exports.register.attributes = {
  name: 'events',
  version: '1.0.0'
};

