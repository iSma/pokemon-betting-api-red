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
  }
})

