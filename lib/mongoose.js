'use strict';

/** @module config/lib/mongoose */

/**
 * Module dependencies.
 */
const mongoose = require('mongoose'),
	q = require('q'),
	_ = require('lodash'),
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
module.exports.connect = (cb) => {
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
			// if not specified, the default poolsize is 5
			poolSize: Math.max(_.get(config, 'mongoose.poolSize', 5), 1),
			// always keep trying to reconnect to the server
			reconnectTries: Number.MAX_SAFE_INTEGER,
			socketOptions: socketOptions
		},
		config: {
			autoIndex: _.get(config, 'mongoose.autoIndex', true)
		}
	};
	return mongoose.connect(config.db, options).then(() => {
		const conn = mongoose.connection;
		logger.info('Connected to MongoDB');
		//Attempt to load all models
		return module.exports.loadModels().then(() => {
			dbs.primary = conn;
			dbs.mongoStore = mongoose.createConnection(config.db, { server: { reconnectTries: Number.MAX_SAFE_INTEGER, socketOptions: socketOptions }});
		}).catch((err) => {
			//If for any reason it fails reject the promise
			logger.fatal({err: err}, 'Mongoose model load failed');
			throw err;
		});
	}).catch((err) => {
		//Log and reject promise
		logger.fatal({err: err}, 'Could not connect to MongoDB!');
		throw err;
	}).nodeify(cb);
};

/**
 * @function disconnect
 * @static
 * @summary Disconnect Mongoose
 * @param cb {Function} Callback
 */
module.exports.disconnect = (cb) => {
	const connections = [];
	if(null != dbs.primary) connections.push(dbs.primary.close());
	if(null != dbs.mongoStore) connections.push(dbs.mongoStore.close());
	return q.all(connections).then(function() {
		logger.info('Disconnected from MongoDB!');
	}).nodeify(cb);
};

/**
 * @function loadModels
 * @static
 * @summary Load the mongoose models
 * @return {Promise}
 */
module.exports.loadModels = () => {
	logger.info('Loading mongoose models');
	return q.try(function() {
		_.each(_.get(config, 'files.server.models'), (modelPath) => require(path.resolve(modelPath)));
	});
};

/**
 * @name dbs
 * @summary Object containing databases
 * @type {Object}
 */
module.exports.dbs = dbs;
