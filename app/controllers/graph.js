'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  // TODO: Extract API URL to global variable
  const Bet = server.app.db.models.Bet

  const edge = (bet) => (bet.ParentId === null ? `"B${bet.BattleId}"` : `"E${bet.ParentId}"`) + ` -> "E${bet.id}";`

  server.route({
    method: 'GET',
    path: '/graph',
    handler: (req, reply) => {
      Bet.findAll()
        .then((bets) => bets.map(edge))
        .then((edges) => edges.join('\n  '))
        .then((edges) => `digraph {\n${edges}\n  node [shape = circle]\n}\n`)
        .then((graph) => reply(graph).code(200))
    },

    config: {
      tags: ['api'],
      description: 'Graph of bets in dot format',
      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.string()
            }
          }
        }
      }
    }
  })

  return next()
}

module.exports.register.attributes = {
  name: 'graph',
  version: '1.0.0',
  dependencies: 'sync'
}

