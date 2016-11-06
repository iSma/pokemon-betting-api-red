'use strict';
const _ = require('lodash');

const request = require('request-json');
const client = request.createClient('http://pokemon-battle.bid/api/v1/');

const Joi = require('joi');
var Event = require('../database.js').Event;


// Build bet graph. Clients should call this function without parameters, and
// it will be called recursively with parameters.
function graph(event) {
  let edges = [];
  if (event === undefined) {
    return Event.findAll({
      where: {
        battle: { $ne: null }
      }
    }).then((events) => {
      events.forEach((e) => { edges.push(`"B${e.battle}" -> "E${e.id}";`) });
      return Promise.all(events.map(graph));
    }).then((newEdges) => {
      newEdges.forEach((e) =>  edges.push(...e));
      let out = edges.join("\n  ");
      return `
digraph {
  node [shape = circle];
  ${out}
}` + '\n'
    });
  } else {
    return Event.findAll({
      where: { EventId: event.id }
    }).then((events) => {
      events.forEach((e) => { edges.push(`"E${event.id}" -> "E${e.id}";`) });
      return Promise.all(events.map(graph));
    }).then((newEdges) => {
      newEdges.forEach((e) =>  edges.push(...e));
      return edges;
    });
  }
}

module.exports.register = (server, options, next) => {
  // GET/events

  server.route({
    method: 'GET',
    path: '/graph',
    handler: (req, reply) => {
      graph().then((graph) => reply(graph).code(200));
    },

    config: {
      tags: ['api'],
      description: 'Graph of bets in dot format',
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

  return next();

};

module.exports.register.attributes = {
  name: 'graph',
  version: '1.0.0'
};

