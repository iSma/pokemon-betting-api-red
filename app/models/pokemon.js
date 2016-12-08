'use strict'
const _ = require('lodash')

module.exports = (db, DataTypes) => db.define('Pokemon', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  hp: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  atk: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  def: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  spatk: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  spdef: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  speed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },

  total: {
    type: DataTypes.VIRTUAL(DataTypes.INTEGER, ['hp', 'atk', 'def', 'spatk', 'spdef', 'speed']),
    get: function () {
      return ['hp', 'atk', 'def', 'spatk', 'spdef', 'speed']
        .map((s) => this[s])
        .reduce((a, b) => a + b)
    }
  }
}, {
  classMethods: {
    associate: function (models) {
      this.belongsToMany(models.Team, { through: 'TeamPokemon' })
    },

    createFromApi: function (api) {
      const pkmn = _(['hp', 'atk', 'def', 'spatk', 'spdef', 'speed'])
        .zipObject(api.stats)
        .merge(api)
        .omit('stats')
        .value()

      return this
        .findOrCreate({
          where: { id: api.id },
          defaults: pkmn
        })
        .then(([pkmn, created]) => pkmn)
    }
  },

  instanceMethods: {
    getStats: function () {
      return this
        .getTeams({ include: [db.models.Battle.scope('teams')] })
        .then((teams) => teams.filter((t) => t.Battle.result))
        .then((teams) => teams.map((team) => [
          team.index === team.Battle.result,
          _.find(team.Battle.Teams, (t) => t.index === team.index),
          _.find(team.Battle.Teams, (t) => t.index !== team.index),
        ]))
        .then((teams) => teams.map(([won, team, opp]) => ({
          won,
          team: {
            trainer: team.TrainerId,
            pokemons: team.Pokemons.map((p) => p.id)
          },
          opp: {
            trainer: opp.TrainerId,
            pokemons: opp.Pokemons.map((p) => p.id)
          }
        })))
        .then((teams) => {
          const stats = (type, group, id) => (id) => _(teams)
            .filter((t) =>
              type === 'trainer'
                ? t[group].trainer === id
                : t[group].pokemons.includes(id))
            .countBy((t) => t.won)
            .defaults({ true: 0, false: 0 })
            .at(['true', 'false'])
            .thru(([won, lost]) => ({ id, won, lost }))
            .value()

          const score = ({ won, lost }) => (won + 1) / (lost + 1)

          const trainers = _(teams)
            .map((t) => t.team.trainer)
            .uniq()
            .map(stats('trainer', 'team'))
            .value()

          const pkmn = _.zipObject(['team', 'opp'],
            ['team', 'opp'].map((group) =>
              _(teams)
                .flatMap((t) => t[group].pokemons)
                .uniq()
                .filter((p) => p !== this.id)
                .map(stats('pokemons', group))
                .value()))

          return {
            id: this.id,
            battles: {
              total: teams.length,
              won: teams.filter((t) => t.won).length,
              lost: teams.filter((t) => !t.won).length
            },
            trainers: {
              best: _.maxBy(trainers, score),
              worst: _.minBy(trainers, score)
            },
            teams: {
              best: _.maxBy(pkmn.team, score),
              worst: _.minBy(pkmn.team, score)
            },
            opponents: {
              best: _.minBy(pkmn.opp, score),
              worst: _.maxBy(pkmn.opp, score)
            }
          }
        })
    }
  }
})

