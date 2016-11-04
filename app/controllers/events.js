'use strict';
var Loadash = require('lodash');

const Joi = require('joi');
var Event = require('../database.js').User;


module.exports.register = (server, options, next) => {
	// GET/events

	server.route({
	  	method: 'GET',
    	path: '/events',
    	handler: (req, reply) => {
    		req.query.limit
    		Event.findAll({

    		}).then(function(events){
    			if (req.query.limit === null) reply(events).code(200);
    			else reply(Loadash.take(events, req.query.limit)).code(200)
    			
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
		              		schema: Joi.array().items(Joi.string())
		            	}
	         		}
	        	}
	      	}
	      }
	});

	return next();

};

module.exports.register.attributes = {
  name: 'events',
  version: '1.0.0'
};

