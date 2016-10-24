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



/*db.sync().then(function () {
	return User.create({
		name: 'John',
		mail: 'jw@fakemail.com',
		password: 'chaton2cite',
		money: 1000
	})});*/

module.exports.db = db;
module.exports.User = User;
