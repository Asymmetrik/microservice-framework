'use strict';

/** @module config/lib/mongoose */

/**
 * Module dependencies.
 */
const mongoose = require('mongoose'),
	q = require('q'),
	path = require('path'),
	config = require('./config'),
	logger = require('./logger').logger;

mongoose.set('debug', (config.mongoose) ? config.mongoose.debug: false);
mongoose.Promise = q.Promise;

const dbs = {};

/**
 * @function connect
 * @static
 * @summary Initialize Mongoose connection
 * @return {q.promise}
 */
module.exports.connect = () => q.Promise((resolve, reject) => {
	//Attempt to connect
	const socketOptions = {
		// enable auto reconnect for node-mongodb-native v2.1 (http://mongodb.github.io/node-mongodb-native/2.1/api/Server.html)
		autoReconnect: true,
		// disable socket timeouts
		socketTimeoutMS: 0,
		// timeout connection attempts after 10 seconds
		connectTimeoutMS: 10000,
		// send a keep alive packet every 1 second
		keepAlive: 1000
	};
	const options = {
		server: {
			// always keep trying to reconnect to the server
			reconnectTries: Number.MAX_SAFE_INTEGER,
			socketOptions: socketOptions
		}
	};
	if (config.mongoose.poolSize) {
		options.server.poolSize = Math.max(config.mongoose.poolSize, 1);
	}
	if (config.mongoose.autoIndex !== null) {
		options.config = {
			autoIndex: config.mongoose.autoIndex
		};
	}
	mongoose.connect(config.db, options, (err) => {
		//In the deferred callback check if an error happened
		if (err) {
			//Log and reject promise
			logger.fatal({err: err}, 'Could not connect to MongoDB!');
			reject(err);
		}
	});

	const openConnection = () => {
		const conn = mongoose.connection;

		logger.info('Connected to MongoDB');

		//Attempt to load all models
		this.loadModels().then(() => {
			dbs.primary = conn;
			dbs.mongoStore = mongoose.createConnection(config.db, { server: { reconnectTries: Number.MAX_SAFE_INTEGER, socketOptions: socketOptions }});
			resolve();
		}).catch((err) => {

			//If for any reason it fails reject the promise
			logger.fatal({err: err}, 'Mongoose model load failed');
			reject(err);
		});
	};

	if(mongoose.connection.readyState === 1)
		openConnection();
	else
		mongoose.connection.once('open', openConnection);
});

/**
 * @function disconnect
 * @static
 * @summary Disconnect Mongoose
 * @param cb {Function} Callback
 */
module.exports.disconnect = (cb) => {
	// Make sure the connections were made
	if(null != dbs.primary) {
		// Disconnect
		q.all([
			dbs.primary.close(),
			dbs.mongoStore.close()
		]).nodeify(function(err) {
			logger.info('Disconnected from MongoDB!');
			if (cb) cb(err);
		});
	} else {
		logger.warn('No MongoDB connection to disconnect!');
		if (cb) cb();
	}
};

/**
 * @function loadModels
 * @static
 * @summary Load the mongoose models
 * @return {Promise}
 */
module.exports.loadModels = () => q.Promise((resolve, reject) => {
	logger.info('Loading mongoose models');
	try {
		config.files.server.models.forEach((modelPath) => require(path.resolve(modelPath)));

		resolve();
	} catch (err) {
		reject(err);
	}
});

/**
 * @name dbs
 * @summary Object containing databases
 * @type {Object}
 */
module.exports.dbs = dbs;
