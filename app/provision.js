'use strict'
const _ = require('lodash')

function Provisioner () {
  this.NUM_USERS = 4
  this.BETS_PER_USER = 4

  const server = { app: {} }
  require('./models').register(server, { }, () => { })

  const { Battle, Bet, User } = server.app.db.models

  this.db = server.app.db

  this.makeBets = function (betsPerUser, numUsers) {
    betsPerUser = betsPerUser || this.BETS_PER_USER

    const data = {
      users: [],
      battles: [],
      bets: []
    }

    const reduce = (promise, user) => promise
      .then(() => data.battles.concat(data.bets))
      .then((events) => _.sample(events))
      .then((event) => user.placeBet(event, _.random(10, 20), _.random(1, 2)))
      .then((bet) => data.bets.push(bet))

    return this.makeUsers(numUsers)
      .then((users) => { data.users = users })
      .then(() => Battle.scope('active').findAll())
      .then((battles) => { data.battles = battles })
      .then(() => Bet.scope('active').findAll())
      .then((bets) => { data.bets = bets })
      .then(() => _.range(betsPerUser))
      .then((n) => data.users.map(_.constant).map((f) => n.map(f)))
      .then(_.flatMap)
      .then(_.shuffle)
      .then((users) => users.reduce(reduce, Promise.resolve()))
      .then(() => data)
  }

  this.makeUsers = function (numUsers) {
    numUsers = numUsers || this.NUM_USERS

    const fundUser = (user) =>
      user
      .getMoney()
      .then((money) => money < 1000 ? user.createTransaction({ amount: 1000 }) : user)
      .then(() => user)

    return User
      .findAll({ where: { mail: { $like: '%@users.test' } } })
      .then((users) => {
        if (users.length >= numUsers) return users

        const n = numUsers - users.length
        let last = users.map((u) => u.mail.split('@')[0].split('-')[1])
        last = Math.max(...last) + 1

        users = _.range(last, last + n)
          .map((i) => User.create({
            name: `User:${i}`,
            mail: `user-${i}@users.test`,
            pass: `user-${i}`
          }))

        return Promise.all(users)
      })
      .then((users) => users.map(fundUser))
      .then((users) => Promise.all(users))
  }
}

module.exports = new Provisioner()
