'use strict'

module.exports = (db, DataTypes) => db.define('Team', {
  index: {
    type: DataTypes.INTEGER,
    allowNull: false
  }

}, {
  indexes: [{
    fields: ['BattleId', 'index'],
    unique: true
  }],

  classMethods: {
    associate: function (models) {
      this.belongsTo(models.Battle, { foreignKey: { allowNull: false } })
      this.belongsTo(models.Trainer, { foreignKey: { allowNull: false } })
      this.belongsToMany(models.Pokemon, { through: 'TeamPokemon' })
    },

    createFromApi: function (api, battle, i) {
      return db.models.Trainer
        .createFromApi(api.trainer)
        .then((trainer) => battle.createTeam({ index: i + 1, TrainerId: trainer.id }))
        .then((team) => team.setPokemons(api.pokemons.map((p) => p.id)))
    }
  },

  scopes: {
    pokemons: () => ({
      include: [db.models.Pokemon]
    }),

    battle: () => ({
      include: [db.models.Battle]
    })
  },

  instanceMethods: {
    toJSON: function () {
      const json = { trainer: this.TrainerId }
      if (this.Pokemons) json.pokemons = this.Pokemons.map((p) => p.id)
      return json
    },

    getOpponent: function () {
      return Promise.resolve(this.Battle || this.getBattle())
        .then((battle) => battle.getTeams({ scope: 'pokemons' }))
        .then((teams) => teams.filter((t) => t.index !== this.index))
        .then((teams) => teams[0])
    }
  }
})

