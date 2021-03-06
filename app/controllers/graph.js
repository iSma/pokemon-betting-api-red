'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  const { Battle, Bet } = server.app.db.models

  function graph (bets) {
    let graph = bets.map(node).concat(bets.map(edge))
    let ids = bets.map((b) => b.BattleId)
    return Battle
      .findAll({ where: { id: { $in: [...new Set(ids)] } } })
      .then((battles) =>
        battles.map((b) =>
          b.getOdds().then((odds) => { b.odds = odds }).then(() => b)))
      .then((battles) => Promise.all(battles))
      .then((battles) => battles.map(node).concat(graph))
      .then((graph) => graph.join('\n  '))
      .then((graph) => `digraph {\n  ${graph}\n  \n}\n`)
  }

  function node (event) {
    let node, label, shape, color
    if (event.Model === Battle) {
      node = `battles/${event.id}`
      label = `${event.id}
start: ${event.startTime.toJSON()}
end: ${event.endTime.toJSON()}
result:${event.result}
odds: [${event.odds.join(':')}]`
      shape = 'box'
      color = event.result === null
        ? 'white'
        : event.result === 1 ? 'cyan' : 'yellow'
    } else {
      node = `bets/${event.id}`
      label = `${event.id}
users/${event.UserId}
choice:${event.choice}
result:${event.result}
odds: [${event.odds.join(':')}]
$$$: ${!event.BetTransaction ? 0 : -event.BetTransaction.amount}
win: ${!event.WinTransaction ? 0 : +event.WinTransaction.amount}`
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
      const scopes = req.query.status
        ? ['transactions', req.query.status]
        : ['transactions']
      Bet
        .scope(scopes)
        .findAll()
        .then((bets) =>
          bets.map((b) =>
            b.getOdds().then((odds) => { b.odds = odds }).then(() => b)))
        .then((bets) => Promise.all(bets))
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

