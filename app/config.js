'use strict'

module.exports.register = (server, options, next) => {
  const pokeapi = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/'

  server.app.config = {
    sync: {
      battleTime: 10 * 60 * 1000,
      minTime: 5 * 1000
    },
    api: {
      battle: 'http://pokemon-battle.bid/api/v1',
      pokemons: `${pokeapi}/csv/pokemon_species.csv`,
      stats: `${pokeapi}/csv/pokemon_stats.csv`,
      images: `${pokeapi}/sprites/pokemon`
    },
    db: {
      host: process.env.POSTGRES_HOST,
      port: 5432,
      pass: process.env.POSTGRES_PASSWORD,
      user: process.env.POSTGRES_USER,
      db: process.env.POSTGRES_DATABSE
    }
  }

  return next()
}

module.exports.register.attributes = {
  name: 'config',
  version: '1.0.0'
}

