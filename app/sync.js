'use strict'
const _ = require('lodash')
const request = require('request-promise')

module.exports.register = (server, options, next) => {
  const config = server.app.config
  const { Battle, Pokemon } = server.app.db.models

  function sync () {
    return Promise.resolve()
      .then(syncPokemon)
      .then(syncExistingBattles)
      .then(syncNewBattles)
  }

  function syncPokemon () {
    const pkmns = request
      .get(config.api.pokemons)
      .then((csv) => csv.split('\n').map((row) => row.split(',')))
      .then((csv) => [_.head(csv), _.tail(csv)])
      .then(([head, data]) => data.map((row) => _.zipObject(head, row)))
      .then((pkmns) => _.map(pkmns, (p) => _.at(p, ['id', 'identifier'])))
      .then(_.fromPairs)
      .then((pkmns) => _.mapValues(pkmns, (name, id) => ({ name, id: +id })))

    const stats = request
      .get(config.api.stats)
      .then((csv) => csv.split('\n').map((row) => row.split(',')))
      .then((csv) => [_.head(csv), _.tail(csv)])
      .then(([head, data]) => data.map((row) => _.zipObject(head, row)))
      .then((stats) => stats.map((s) => _.mapValues(s, _.parseInt)))
      .then((stats) => stats.map((s) => _.at(s, ['stat_id', 'base_stat', 'pokemon_id'])))
      .then((stats) => _.filter(stats, (s) => s[0] <= 6))
      .then((stats) => _.groupBy(stats, (s) => s[2]))
      .then((stats) => _.mapValues(stats, _.fromPairs))
      .then((stats) => _.mapValues(stats, (s) => _.at(s, [1, 2, 3, 4, 5, 6])))
      .then((stats) => _.mapValues(stats, (stats) => ({ stats })))

    return Promise.all([pkmns, stats])
      .then(([pkmns, stats]) => _.merge(pkmns, stats))
      .then((pkmns) => _.filter(pkmns, (p) => p.id))
      .then((pkmns) => _.filter(pkmns, (p) => p.stats))
      .then((pkmns) => pkmns.map((p) => Pokemon.createFromApi(p)))
      .then((pkmns) => Promise.all(pkmns))
      .then((pkmns) => console.log(`> Caught ${pkmns.length} Pokémons`))
  }

  function syncExistingBattles () {
    return Battle
      .findAll({ where: { result: null } })
      .then((battles) => battles.forEach((b) => b.scheduleSync()))
  }

  function syncNewBattles () {
    const now = new Date()
    console.log(`>>> syncNewBattles() ${now})`)
    return getNewBattles()
      .then((battles) => console.log(`>>> syncNewBattles > ${battles.length} new battles`))
      .then(() => Battle.findOne({ where: { endTime: null }, order: ['startTime'] }))
      .then((battle) => {
        const now = new Date()
        let next = battle
          ? battle.startTime - now + config.sync.minTime
          : 30 * 1000

        while (next < 0) next += config.sync.battleTime
        console.log(`>>> syncNewBattles > next sync in ${next / 1000}s`)
        setTimeout(syncNewBattles, next)
      })
  }

  // Fetch all new battles that aren't in our DB
  function getNewBattles () {
    console.log(`getNewBattles()`)
    return Battle.max('id')
      .then((lastId) => Battle.count().then((count) => [lastId, count]))
      .then(([lastId, count]) => lastId ? findOffset(lastId, count) : 0)
      .then(getBattles)
      .then((battles) => battles.map((b) => Battle.createFromApi(b)))
      .then((battles) => Promise.all(battles))
      .then((battles) => {
        battles.forEach((b) => b.scheduleSync())
        return battles
      })
  }

  // Find the offset of lastId
  function findOffset (lastId, offset) {
    console.log(`findOffset(${lastId}, ${offset})`)
    offset = offset || lastId
    return offset <= 0 ? 0
      : request
      .get(`${config.api.battle}/battles?limit=100&offset=${offset}`)
      .then((res) => JSON.parse(res))
      .then((battles) => battles.map((b) => b.id).indexOf(lastId))
      .then((i) => i > 0 ? offset + i + 1 : findOffset(lastId, offset - 100))
  }

  // Get all remote battles starting at offset
  function getBattles (offset) {
    console.log(`getBattles(${offset})`)
    return request
      .get(`${config.api.battle}/battles?limit=100&offset=${offset}`)
      .then((res) => JSON.parse(res))
      .then((battles) =>
        battles.length < 100
          ? battles
          : getBattles(offset + 100).then((b) => battles.concat(b))
      )
  }

  return sync().then(() => next())
}

module.exports.register.attributes = {
  name: 'sync',
  version: '1.0.0',
  dependencies: 'models'
}

