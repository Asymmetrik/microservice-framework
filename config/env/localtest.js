'use strict';

/** @module config/env/default */

var env = require('var');

/**
 * @name exports
 * @static
 * @summary Default environment
 */
module.exports = {
	mongoose: {
		debug: true
	},
	db:  'mongodb://localhost/' + env.MONGO_DATABASE,
	log: {
		level: 'crit'
	}
};
