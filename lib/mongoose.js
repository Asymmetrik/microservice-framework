'use strict';

/** @module config/lib/mongoose */

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	q = require('q'),
	path = require('path'),
	config = require('./config'),
	logger = require('./logger').logger;

logger.info('Initializing MongoDB Connections...');

mongoose.set('debug', (config.mongoose) ? config.mongoose.debug: false);
mongoose.Promise = q.Promise;

var dbs = {};

/**
 * @function connect
 * @static
 * @summary Initialize Mongoose and return the connection as a promise or callback.
 *  If the database has already been connected, the existing connection will be returned.
 * @param {Function} cb An optional callback to be invoked with the mongoose connection.
 * @return {Promise} A promise to be resolved with the mongoose connection.
 */
module.exports.connect = function (cb) {
	var listenToConnection = q.Promise(function (resolve, reject) {
		var db = mongoose.connection;
		db.on('error', function (err) {
			logger.error('Mongoose error', err);
			reject(err);
		});
		db.once('open', function () {
			logger.info('Connected to MongoDB');
			dbs.primary = db;
			resolve(db);
		});
		// To avoid race conditions, resolve if we're already connected
		if (db.readyState === 1) {
			logger.info('Already connected to MongoDB');
			resolve(db);
		}
	});

	return q.when(mongoose.connect(config.db))

		// Setup connection listeners
		.then(listenToConnection)

		// Attempt to load all models
		.then(module.exports.loadModels)

		// Return the mongoose connection
		.then(q.when.bind(null, mongoose.connection))
		.nodeify(cb);
};

/**
 * @function disconnect
 * @static
 * @summary Disconnect Mongoose
 * @param cb {Function} Callback
 */
module.exports.disconnect = function(cb) {
	var db = mongoose.connection;
	console.warn(dbs.primary);
	// Make sure the connections were made
	if (db != null && db.disconnect != null) {
		// Disconnect
		db.disconnect(function (err) {
			logger.warn('Disconnected from MongoDB!');
			cb(err);
		});
	}
	else if (db != null ) {
		logger.warn('MongoDB not connected!');
		logger.warn(db);
	} else {
		logger.warn('No MongoDB connection to disconnect!');
		cb();
	}
};

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
