'use strict';
const _ = require('lodash');

const request = require('request-json');
const client = request.createClient('http://pokemon-battle.bid/api/v1/');

const Joi = require('joi');


module.exports.register = (server, options, next) => {
  // TODO: Extract API URL to global variable
  const client = request.createClient('http://pokemon-battle.bid/api/v1/');
  var {Bet, Transaction} = server.app.DB;

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
        path: '/bets',
        handler: (req, reply) => {
            if(req.query.is_finished === undefined){
                Bet.findAll().then((bets) => {
                    if (req.query.limit === undefined) reply(bets).code(200);
                    else reply(_.take(bets, req.query.limit)).code(200);
                });

            } else {
                let query = {where:{}};
                if (!req.query.is_finished){
                    query.where.result = null;
                }else{
                    query.where.result = { $ne:null };
                }
                Bet.findAll(query).then(function(bets){
                    if (req.query.limit === undefined) reply(bets).code(200);
                    else reply(_.take(bets, req.query.limit)).code(200);

                })
            }
        },

        config: {
            tags: ['api'],
            description: 'list all bets/bets',
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
        path: '/bets/{id}',
        handler: (req, reply) => {
            req.query.limit
            Bet.findOne({
                where:{
                    id: req.params.id
                }
            }).then(function(bet){
                reply(bet).code(200);

            })
        },

        config: {
            tags: ['api'],
            description: 'list all bets/bets',
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
        path: '/bets/{id}/bets',
        handler: (req, reply) => {
            req.query.limit
            Bet.findAll({
                where:{
                    BetId: req.params.id
                }
            }).then(function(bets){
                reply(bets).code(200);

            })
        },

        config: {
            tags: ['api'],
            description: 'list all bets/bets made on a certain id',
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

	return next();

};

module.exports.register.attributes = {
  name: 'bets',
  version: '1.0.0',
  dependencies: 'sync'
};

