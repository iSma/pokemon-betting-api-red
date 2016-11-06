'use strict';
const _ = require('lodash');

const request = require('request-json');
const client = request.createClient('http://pokemon-battle.bid/api/v1/');

const Joi = require('joi');
var Event = require('../database.js').Event;


module.exports.register = (server, options, next) => {
  // TODO: Extract API URL to global variable
  const client = request.createClient('http://pokemon-battle.bid/api/v1/');
  const Event = server.app.DB.Event;

	server.route({
	  	method: 'GET',
    	path: '/battles',
    	handler: (req, reply) => {
            let response = [];
            client.get(`battles/?limit=100&is_finished=false`).then(function(battles){
                let now = new Date();
                for(let b of battles.body){
                    if(Date.parse(now) < Date.parse(b.start_time)){
                        response.push(b);
                    }
                }
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
		              		schema: Joi.array().items(Joi.string()) //to do joi sequelize
		            	}
	         		}
	        	}
	      	}
	      }
	});

    server.route({
        method: 'GET',
        path: '/events',
        handler: (req, reply) => {
            if(req.query.is_finished === undefined){
                Event.findAll().then((events) => {
                    if (req.query.limit === undefined) reply(events).code(200);
                    else reply(_.take(events, req.query.limit)).code(200);
                });

            } else {
                let query = {where:{}};
                if (!req.query.is_finished){
                    query.where.result = null;
                }else{
                    query.where.result = { $ne:null };
                }
                Event.findAll(query).then(function(events){
                    if (req.query.limit === undefined) reply(events).code(200);
                    else reply(_.take(events, req.query.limit)).code(200);

                })
            }
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
            description: 'list all events/bets made on a certain id',
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
              reply(new_event.id).code(201);
              return new_event;
            }).catch(function(error){
                reply('event not created').code(404);
            }).then((new_event)=>{
                Transaction.create({
                    UserId: new_event.UserId,
                    EventId: new_event.id,
                    amount: new_event.amount
                })
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
  version: '1.0.0',
  dependencies: 'sync'
};

