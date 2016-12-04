'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
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
    let node, label, shape, color
    if (event.Model === Battle) {
      node = `battles/${event.id}`
      label =
        `${event.id}\n` +
        `result:${event.result}`
      shape = 'invhouse'
      color = event.result === null
        ? 'white'
        : event.result === 1 ? 'cyan' : 'yellow'
    } else {
      node = `bets/${event.id}`
      label =
        `${event.id}\n` +
        `users/${event.UserId}\n` +
        `choice:${event.choice}\n` +
        `result:${event.result}`
      shape = 'note'
      color = event.won === null
        ? 'white'
        : event.won ? 'green' : 'red'
    }

    return `"${node}"[shape=${shape},label="${label}",style=filled,fillcolor=${color}]`
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
        .then(reply)
    },

    config: {
      tags: ['api'],
      description: 'Graph of bets in dot format',
      validate: {
        query: {
          status: Joi.string()
            .valid(['active', 'started', 'ended'])
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

