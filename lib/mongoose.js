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
    logger.info('Initializing MongoDB Connections...');

    mongoose.Promise = q.Promise;

    //Attempt to connect
    mongoose.connect(config.db, (err) => {
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
        resolve(conn.db);
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
module.exports.disconnect = function(cb) {
	// Make sure the connections were made'
	if(null != dbs.primary && null != dbs.primary.close) {
		// Disconnect
		dbs.primary.close(function(err) {
			logger.info('Disconnected from MongoDB!');
			cb(err);
		});
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

/**
 * @name dbs
 * @summary Object containing databases
 * @type {Object}
 */
module.exports.dbs = dbs;
