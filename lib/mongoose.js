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
mongoose.Promise = q.Promise;

/**
 * @function loadModels
 * @static
 * @summary Load the mongoose models
 * @return {Promise}
 */
module.exports.loadModels = function (cb) {
	if (config.files.server.models) {
		logger.info('Loading mongoose models');

		return q.when()
			.then(function () {
				config.files.server.models.forEach(function (modelPath) {
					require(path.resolve(modelPath));
				});
			})
			.catch(function (err) {
				logger.fatal({err: err}, 'Mongoose model load failed');
				throw err;
			})
			.nodeify(cb);
	}
	else {
		logger.info('No mongoose models are defined');
		return q().nodeify(cb);
	}
};

/**
 * @function connect
 * @static
 * @summary Initialize Mongoose and return the connection as a promise or callback.
 *  If the database has already been connected, the existing connection will be returned.
 * @param {Function} cb An optional callback to be invoked with the mongoose connection.
 * @return {Promise} A promise to be resolved with the mongoose connection.
 */
module.exports.connect = function (cb) {
	return q.when(mongoose.connect(config.db))
		.then(function() {
			var db = mongoose.connection;
			db.on('error', function(err) {
				logger.error('Mongoose error', err);
			});
			db.once('open', function() {
				logger.info('Connected to MongoDB');
			});

			//Attempt to load all models
			return module.exports.loadModels()
				.then(function () {
					return db;
			});
		})
		.nodeify(cb);
};
