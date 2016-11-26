'use strict'
const _ = require('lodash')

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
      .then((battles) => battles.map((b) => b.syncRemote()))
      .then((battles) => Promise.all(battles))
      .then((battles) => battles.forEach((b) => b.scheduleSync()))
  }

  function syncNewBattles () {
    const now = new Date()
    console.log(`syncNewBattles() ${now})`)
    getNewBattles()
      .then((battles) => {
        const next = battles.length === 0
          ? 30 * 1000
          : Math.max(0, _.last(battles).startTime - now) + (10 * 60 + 30) * 1000
        setTimeout(syncNewBattles, next)
      })
  }

  // Fetch all new battles that aren't in our DB
  function getNewBattles () {
    console.log(`getNewBattles()`)
    return Battle.max('id')
      .then((lastId) => lastId ? findOffset(lastId) : 0)
      .then(getBattles)
      .then((battles) => battles.map((b) => Battle.fromApi(b)))
      .then((battles) => battles.map((b) => Battle.create(b)))
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
    return offset === 0
      ? 0
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

