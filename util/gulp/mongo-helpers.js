'use strict';

/** @module util/services/script */

var mongoose = require('mongoose'),
	gutil = require('gulp-util'),
	q = require('q'),
	fs = require('fs');

/**
 * @summary Save the model, invoke a promise
 * @param model {Object} Mongoose model to save
 * @returns {Promise}
 */
exports.saveModel = function(model) {
	return q.ninvoke(model, 'save').then(function() {
		gutil.log('saved ' + model.constructor.modelName + ': ' + (model.name || model.slug || model._id));
	});
};

/**
 * @summary Drop mongo collection by name, invoke a promise
 * @param collectionName {string} Collection name
 * @returns {Promise}
 */
exports.dropCollection = function(collectionName) {
	return q.ninvoke(mongoose.connection.db, 'dropCollection', collectionName).then(function() {
		gutil.log('dropped ' + collectionName + ' collection');
	}).fail(function(err) {
		gutil.log('failed to drop ' + collectionName + ' collection - ' + err);
	});
};

/**
 * @summary Create mongo collection by name, invoke a promise
 * @param collectionName {string} Collection name
 * @returns {Promise}
 */
exports.createCollection = function(collectionName) {
	return q.ninvoke(mongoose.connection.db, 'createCollection', collectionName).then(function() {
		gutil.log('created ' + collectionName + ' collection');
	}).fail(function(err) {
		gutil.log('failed to create ' + collectionName + ' collection - ' + err);
	});
};

/**
 * @summary Read file from disk
 * @param filePath {string} Filepath to file
 * @returns {Promise}
 */
exports.readFile = function(filePath) {
	return q.ninvoke(fs, 'readFile', filePath, 'utf-8').fail(function(err) {
    	gutil.log('failed to read ' + filePath + ' - ' + err);
    });
};