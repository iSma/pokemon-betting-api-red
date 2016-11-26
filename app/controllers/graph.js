'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  // TODO: Extract API URL to global variable
  const { Battle, Bet } = server.app.db.models

  function graph (bets) {
    let graph = bets.map(node).concat(bets.map(edge))
    let ids = bets.map((b) => b.BattleId)
    return Battle
      .findAll({ where: { id: { $in: [...new Set(ids)] } } })
      .then((battles) => battles.map(node).concat(graph))
      .then((graph) => graph.join('\n  '))
      .then((graph) => `digraph {\n  ${graph}\n  \n}\n`)
  }

  function node (event) {
    if (event.Model === Battle) {
      const node = `battles/${event.id}`
      const label = `${event.id}\nresult:${event.result}`
      const color = event.result === null ? 'white' : event.result === 1 ? 'cyan' : 'yellow'
      return `"${node}"[shape=invhouse,label="${label}",style=filled,fillcolor=${color}]`
    } else {
      const node = `bets/${event.id}`
      const label = `${event.id}\nusers/${event.UserId}\nchoice:${event.choice}\nresult:${event.result}`
      const color = event.won === null ? 'white' : event.won ? 'green' : 'red'
      return `"${node}"[shape=box,label="${label}",style=filled,fillcolor=${color}]`
    }
  }

  function edge (bet) {
    let A =
      bet.ParentId === null
      ? `"battles/${bet.BattleId}"`
      : `"bets/${bet.ParentId}"`

    let B = `"bets/${bet.id}"`

    return `${A} -> ${B};`
  }

  server.route({
    method: 'GET',
    path: '/graph',
    handler: (req, reply) => {
      Bet
        .scope(req.query.status)
        .findAll()
        .then(graph)
        .then((graph) => reply(graph).code(200))
    },

    config: {
      tags: ['api'],
      description: 'Graph of bets in dot format',
      validate: {
        query: {
          status: Joi.string()
            .valid(['active', 'started', 'finished'])
        }
      },

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

