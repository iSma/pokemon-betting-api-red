'use strict'

module.exports.register = (server, options, next) => {
  const client = server.app.db.client
  const { Battle } = server.app.db.models

  function sync () {
    syncExistingBattles()
    syncNewBattles()
  }

  function syncExistingBattles () {
    Battle
      .findAll({ where: { result: null } })
      .then((battles) => battles.forEach((b) => b.scheduleSync()))
  }

  function syncNewBattles () {
    const now = new Date()
    console.log(`>>> syncNewBattles() ${now})`)
    getNewBattles()
      .then((battles) => console.log(`>>> syncNewBattles > ${battles.length} new battles`))
      .then(() => Battle.findOne({ where: { endTime: null }, order: ['startTime'] }))
      .then((battle) => {
        const now = new Date()
        let next = battle
          ? battle.startTime - now + 10 * 1000 // TODO: save intervals as global constants
          : 30 * 1000

        while (next < 0) next += 10 * 60 * 1000 // New battles appear every 10 minutes
        console.log(`>>> syncNewBattles > next sync in ${next / 1000}s`)
        setTimeout(syncNewBattles, next)
      })
  }

  // Fetch all new battles that aren't in our DB
  function getNewBattles () {
    console.log(`getNewBattles()`)
    return Battle.max('id')
      .then((lastId) => Battle.count().then((count) => [lastId, count]))
      .then(([lastId, count]) => lastId ? findOffset(lastId, count) : 10400)
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
      : client
      .get(`battles?limit=100&offset=${offset}`)
      .then((res) => res.res.statusCode === 200 ? res.body : Promise.reject()) // TODO
      .then((battles) => battles.map((b) => b.id).indexOf(lastId))
      .then((i) => i > 0 ? offset + i + 1 : findOffset(lastId, offset - 100))
  }

  // Get all remote battles starting at offset
  function getBattles (offset) {
    console.log(`getBattles(${offset})`)
    return client
      .get(`battles?limit=100&offset=${offset}`)
      .then((res) => res.res.statusCode === 200 ? res.body : Promise.reject()) // TODO
      .then((battles) =>
        battles.length < 100
          ? battles
          : getBattles(offset + 100).then((b) => battles.concat(b))
      )
  }

  sync()
  return next()
}

module.exports.register.attributes = {
  name: 'sync',
  version: '1.0.0',
  dependencies: 'models'
}

