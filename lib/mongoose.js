'use strict';

/** @module config/lib/mongoose */

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	q = require('q'),
	config = require('./config'),
	logger = require('./bunyan').logger;

logger.info('Initializing MongoDB Connections...');

mongoose.set('debug', (config.mongoose) ? config.mongoose.debug: false);

/**
 * @function loadModels
 * @static
 * @summary Load the mongoose models
 * @return {Promise}
 */
module.exports.loadModels = function loadModels(cb) {
	logger.info('Loading mongoose models');

 	return q.when()
	    .then(function() {
			config.files.server.models.forEach(function(modelPath) {
				require(path.resolve(modelPath));
			});
		})
	    .catch(function(err) {
		    logger.fatal({err: err}, 'Mongoose model load failed');
		    throw err;
	    })
	    .nodeify(cb);
};

var dbs = {};

/**
 * @function connect
 * @static
 * @summary Initialize Mongoose and return the connection as a promise or callback.
 *  If the database has already been connected, the existing connection will be returned.
 * @param {Function} cb An optional callback to be invoked with the mongoose connection.
 * @return {Promise} A promise to be resolved with the mongoose connection.
 */
module.exports.connect = function connect(cb) {
	// If we already connected the database, return it
	if (null != dbs.primary && null != dbs.primary.disconnect) {
		return wrap(cb, q.when(dbs.primary));
	}

	//Attempt to connect
	return q.ninvoke(mongoose, 'connect', config.db)
		.then(function(db) {
			logger.info('Connected to MongoDB');

			//Attempt to load all models
			return loadModels().then(function () {
				dbs.primary = db;
				return db;
			});
		})
		.nodeify(cb);
};

/**
 * @function disconnect
 * @static
 * @summary Disconnect Mongoose
 * @param cb {Function} Optional callback
 * @return {Promise} A promise to be resolved when Mongoose is disconnected
 */
module.exports.disconnect = function disconnect(cb) {
	// Make sure the connections were made
	if (null != dbs.primary && null != dbs.primary.disconnect) {
		// Disconnect
		return q.ninvoke(dbs.primary, 'disconnect')
			.then(function() {
				logger.info('Disconnected from MongoDB!');
				dbs.primary = null;
			})
			.nodeify(cb);
	}
	else {
		logger.warn('No MongoDB connection to disconnect!');
		return q.when().nodeify(cb);
	}
};

/**
 * @name dbs
 * @summary Object containing databases
 * @type {Object}
 */
module.exports.dbs = dbs;
