'use strict'
const _ = require('lodash')

module.exports = (db, DataTypes) => db.define('Trainer', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  gender: {
    type: DataTypes.ENUM,
    values: ['male', 'female'],
    allowNull: false
  },

  country: {
    type: DataTypes.STRING(2),
    validate: { isLowercase: true },
    len: 2,
    allowNull: false,
    set: function (val) {
      this.setDataValue('country', val.substring(0, 2).toLowerCase())
    }
  }
}, {
  classMethods: {
    associate: function (models) {
      this.hasMany(models.Team, { foreignKey: { allowNull: false } })
    },

    createFromApi: function (api) {
      return this
        .findOrCreate({
          where: { id: api.id },
          defaults: {
            name: api.name,
            gender: api.gender,
            country: api.country_code
          }
        })
        .then(([trainer, created]) => trainer)
    }
  },

  instanceMethods: {
    getStats: function () {
      return this
        .getTeams({ include: [db.models.Battle.scope('teams')] })
        .then((teams) => teams.filter((t) => t.Battle.result))
        .then((teams) => teams.map((team) => [
          team.index === team.Battle.result,
          _.find(team.Battle.Teams, (t) => t.TrainerId === this.id),
          _.find(team.Battle.Teams, (t) => t.TrainerId !== this.id)
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
            .map((t) => t.opp.trainer)
            .uniq()
            .map(stats('trainer', 'opp'))
            .value()

          const pkmn = _(teams)
            .flatMap((t) => t.team.pokemons)
            .uniq()
            .map(stats('pokemons', 'team'))
            .value()

          return {
            id: this.id,
            battles: {
              total: teams.length,
              won: teams.filter((t) => t.won).length,
              lost: teams.filter((t) => !t.won).length
            },
            trainers: {
              best: _.minBy(trainers, score),
              worst: _.maxBy(trainers, score)
            },
            pokemons: {
              best: _.maxBy(pkmn, score),
              worst: _.minBy(pkmn, score)
            }
          }
        })
    }
  }
})

