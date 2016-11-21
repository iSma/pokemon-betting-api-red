'use strict';
const request = require('request-json');
// TODO: Extract API URL to global variable
const client = request.createClient('http://pokemon-battle.bid/api/v1/');

class Battle {
  constructor(battle) {
    this.id = battle.id;
    this.startTime = battle.start_time;
    this.endTime = battle.end_time;
    this.trainers = [battle.team1.trainer.id, battle.team2.trainer.id];

    this.result = battle.winner ?
      battle.team1.trainer.id == battle.winner.trainer_id : null;

    this.pokemons = [
      battle.team1.pokemons.map((pkmn) => pkmn.id),
      battle.team2.pokemons.map((pkmn) => pkmn.id)
    ];
  }

  // TODO: make faster
  static getAll(query) {
    query = query || {};
    query.isFinished = query.isFinished || false;
    query.isStarted = query.isStarted || false;

    let battles = [];
    const loop = (result) => {
      if (result.res.statusCode !== 200)
        throw {
          err: 'Unknown error',
          code: 500
        };

      battles = battles.concat(result.body);
      if (result.body.length < 100)
        return battles.map((battle) => new this(battle));
      else
        return client
        .get(`battles?is_finished=${query.isFinished}&limit=100&offset=${battles.length}`)
        .then(loop);
    };

    console.log(`battles?is_finished=${query.isFinished}?limit=100`);
    const now = new Date();
    return client
      .get(`battles?is_finished=${query.isFinished}&limit=100`)
      .then(loop)
      .then((battles) =>
        battles.filter((battle) =>
          (Date.parse(battle.startTime) < now) == query.isStarted
        )
      )
  }

  static get(id) {
    return client.get(`battles/${id}`)
      .then((result) => {
        if (result.res.statusCode === 200)
          return new this(result.body);
        else
          throw {
            err: `Battle ${id} does not exist.`,
            code: 404
          };
      });
  }

  static associate(models) {
    this.prototype.getBets = function() {
      return models.Bet.findAll({
        attributes: ['id', 'battle', 'result', 'createdAt'],
        where: {battle: this.id}
      });
    }
  }
}

module.exports = Battle;
