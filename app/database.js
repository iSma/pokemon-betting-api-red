'use strict';

const Sequelize = require('sequelize');
const db = new Sequelize(
  process.env.POSTGRES_DATABSE,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD, {
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres',
    port:5432
  });

var User = db.define('user', {
	name: {
		type: Sequelize.STRING
	},
	mail: {
		type: Sequelize.STRING
	},
	password: {
		type: Sequelize.STRING
	},
	money: {
		type: Sequelize.FLOAT
	}
});

const Event = db.define('Event', {
  date: {
    type: Sequelize.DATE
  },

  // If this is a 1st order bet, battle is the ID (from pokemon-battle.bid) on
  // which it is based. For higher-order bets, this field is NULL.
  battle: {
    type: Sequelize.INTEGER
  },

  amount: {
    type: Sequelize.INTEGER
  },

  // The result the user expects from this bet:
  // "true" means Trainer1 wins the battle OR the parent bet was correct.
  choice: {
    type: Sequelize.BOOLEAN
  },

  // Same convention as choice. "true" doesn't mean the better was right!
  // Instead, it gives the result of the parent bet/battle. The better was
  // right if choice == result.
  result: {
    type: Sequelize.BOOLEAN
  }
});

User.hasMany(Event);
Event.hasOne(Event);

/*db.sync().then(function () {
	return User.create({
		name: 'John',
		mail: 'jw@fakemail.com',
		password: 'chaton2cite',
		money: 1000
	})});*/

module.exports = {
  db: db,
  User: User,
  Event: Event
};
