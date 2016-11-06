'use strict';

const request = require('request-json');
const Event = require('./database').Event;

function sync() {
  // TODO: Extract API URL to global variable
  const client = request.createClient('http://pokemon-battle.bid/api/v1/');

  Event.findAll({
    // Get all 1st order bets (betting on a battle) that haven't been resolved.
    where: {
      battle: { $ne: null },
      result: null
    }
  }).then((events) => {
    // Get list of unique battle IDs to sync.
    const battleIds = new Set(events.map((e) => e.battle));

    for (let id of battleIds) {
      console.log(`battles/${id}`)
      client.get(`battles/${id}`).then((result) => {
        if (result.res.statusCode != 404) {
          // Battle has been deleted from remote API
          // TODO: Delete all bets referencing to this battle
          return;
        } else if (result.res.statusCode != 200) {
          // TODO: Handle error.
        } else {
          const battle = result.body;
          if (battle.end_time === null) return; // Battle isn't finished yet

          const battleResult = battle.winner.trainer_id == battle.team1.trainer.id;

          // Save the result to all bets referring to this battle and
          // recursively update the child bets.
          Event.update(
            { result: battleResult },
            { where: { battle: id } })
            .then((events) => { events.forEach(syncRecursive) });
        };
      });
    }
  });
}


function syncRecursive(event) {
  // TODO: Pay user's winnings
  const result = event.choice == event.result;

  // Recursively update child bets.
  Event.update(
    { result: result },
    { where: { battle: id } })
    .then((events) => { events.forEach(syncRecursive) });
}

module.exports = sync;
