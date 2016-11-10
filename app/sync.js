'use strict';

const request = require('request-json');

module.exports.register = (server, options, next) => {
  // TODO: Extract API URL to global variable
  const client = request.createClient('http://pokemon-battle.bid/api/v1/');
  const Bet = server.app.DB.Bet;

  function sync(bet) {
    // TODO: refactor as Promise
    if (bet !== undefined) {
      // We are being called recursively
      // TODO: Pay user's winnings
      const result = bet.choice == bet.result;

      // Recursively update child bets
      Bet.update(
        { result: result },
        { where: { battle: id } })
        .then((bets) => { bets.forEach(syncRecursive) });
    } else {
      // We are in the root call
      Bet.findAll({
        // Get all 1st order bets (betting on a battle) that haven't been
        // resolved.
        where: {
          battle: { $ne: null },
          result: null
        }
      }).then((bets) => {
        // Get list of unique battle IDs to sync.
        const battleIds = new Set(bets.map((e) => e.battle));
        for (let id of battleIds) {
          client.get(`battles/${id}`).then((res) => {
            const battle = res.body;
            if (battle.end_time === null) return; // Battle isn't finished yet

            const result = battle.winner.trainer_id == battle.team1.trainer.id;
            // Save the result to all bets referring to this battle and
            // recursively update the child bets.
            Bet.update(
              { result: result },
              { where: { battle: id } })
              .then((bets) => { bets.forEach(sync) });
          }).catch((err) => {
            // TODO: Handle error.
            // Battle might have been deleted from remote API
            // Ideall, the API would answer 404 status and a JSON document,
            // however, it answers with an HTML document, leading to a JSON
            // parsing error. This is why we are here.
            // TODO: Delete all bets referencing to this battle
          });
        }
      });
    }
  }

  sync();
  setInterval(sync, 1000*30); // Sync every half minute
  // TODO: Extract sync period to global variable
  return next();
}

module.exports.register.attributes = {
  name: 'sync',
  version: '1.0.0',
  dependencies: 'models'
};

