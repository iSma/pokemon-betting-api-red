'use strict'
const Joi = require('joi')

module.exports.register = (server, options, next) => {
  const { Pokemon } = server.app.db.models
  const J = server.app.joi

  // Routes covered in this module:
  // - /pokemons
  //  + GET: list of pokemons
  //
  // - /pokemons/{id}
  //  + GET: info about given pokemon
  //
  // - /pokemons/{id}/battles
  //  TODO+ GET: list of battles this pokemon is participating in
  //
  // - /pokemons/{id}/stats
  //  TODO+ GET

  // GET /pokemons
  server.route({
    method: 'GET',
    path: '/pokemons',
    handler: (req, reply) => {
      // TODO: limit/offset
      Pokemon
        .findAll()
        .then(reply)
    },

    config: {
      tags: ['api'],
      description: 'List all pokemons',

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: Joi.array().items(J.Pokemon.joi())
            }
          }
        }
      }
    }
  })

  // GET /pokemons/{id}
  server.route({
    method: 'GET',
    path: '/pokemons/{id}',
    handler: (req, reply) => {
      Pokemon
        .findById(req.params.id)
        .then((pkmn) => Pokemon.check404(pkmn))
        .then(reply)
        .catch(reply)
    },

    config: {
      tags: ['api'],
      description: 'Get a pokemon',
      validate: {
        params: {
          id: J.ID.required()
        }
      },

      plugins: {
        'hapi-swagger': {
          'responses': {
            200: {
              description: 'Success',
              schema: J.Pokemon.joi()
            },
            404: {
              description: 'Pokemon not found',
              schema: Joi.object()
            }
          }
        }
      }
    }
  })

  return next()
}

module.exports.register.attributes = {
  name: 'pokemons',
  version: '1.0.0',
  dependencies: 'sync'
}

