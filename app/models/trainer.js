'use strict';
const request = require('request-json');
// TODO: Extract API URL to global variable
const client = request.createClient('http://pokemon-battle.bid/api/v1/');

class Trainer {
  constructor(trainer) {
    this.id = trainer.id;
    this.name = trainer.name;
    this.gender = trainer.gender
    this.country = trainer.country_code.toLowerCase();
  }

  // TODO: filter by country/gender ?
  static getAll() {
    let trainers = [];

    const loop = (result) => {
      if (result.res.statusCode !== 200)
        throw {
          err: 'Unknown error',
          code: 500
        };

      trainers = trainers.concat(result.body);
      console.log(trainers.length);
      if (result.body.length < 100)
        return trainers.map((trainer) => new Trainer(trainer));
      else
        return client.get(`trainers?limit=100&offset=${trainers.length}`)
        .then(loop);
    };

    return client.get(`trainers?limit=100`).then(loop);
  }

  static get(id) {
    return client.get(`trainers/${id}`)
      .then((result) => {
        if (result.res.statusCode === 200)
          return new this(result.body);
        else
          throw {
            err: `Trainer ${id} does not exist.`,
            code: 404
          };
      });
  }

  static associate(models) {
    // TODO: add isFinished/isStarted
    this.prototype.getBattles = function() {
      return models.Battle.getAll({})
        .then((battles) =>
          battles.filter((battle) => battle.trainers.includes(this.id))
        );
    }
  }
}

module.exports = Trainer;
