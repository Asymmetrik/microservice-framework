'use strict';

/** @module lib/file */

var fs = require('fs'),
	q = require('q'),
	path = require('path'),
	_ = require('lodash');

/**
 * @summary Get files by glob patterns
 * @param globPatterns {Array|String} A glob pattern, or a list of glob patterns
 * @param excludes? {Array} Remove any path segments in this list when loading the files
 * @return {Array} An array of files that match the glob patterns
 */
module.exports.getGlobbedPaths = function getGlobbedPaths(globPatterns, excludes) {
	// URL paths regex
	var urlRegex = new RegExp('^(?:[a-z]+:)?\/\/', 'i');

	// The output array
	var output = [];

	// If glob pattern is array so we use each pattern in a recursive way, otherwise we use glob
	if (_.isArray(globPatterns)) {
		globPatterns.forEach(function(globPattern) {
			output = _.union(output, getGlobbedPaths(globPattern, excludes));
		});
	}
	else if (_.isString(globPatterns)) {
		if (urlRegex.test(globPatterns)) {
			output.push(globPatterns);
		}
		else {
			var files = glob.sync(globPatterns);

			if (excludes) {
				if (_.isString(excludes)) {
					excludes = [excludes];
				}
				files = files.map(function(file) {
					return _.reduce(excludes, function(accumulator, value) {
						return accumulator.replace(value, '');
					}, file);
				});
			}
			output = _.union(output, files);
		}
	}
	return output;
};

/**
 * Create a directory and any of its parent directories that don't already exist, asynchronously.
 * @param {string} filepath The absolute path of the directory
 * @returns {Promise} A promise that returns the filepath once the directories are created
 */
module.exports.mkdirs = function mkdirs(filepath) {
	if (fs.existsSync(filepath)) {
		return q.when(filepath);
	}
	// Recursively make any parent directories
	return mkdirs(path.dirname(filepath))
		.then(function() {
			return q.ninvoke(fs, 'mkdir', filepath);
		})
		.then(function() {
			return filepath;
		});
};

/**
 * Create a directory and any of its parent directories that don't already exist, synchronously.
 * @param {string} filepath The absolute path of the directory
 * @returns {string} The provided filepath
 */
module.exports.mkdirsSync = function mkdirsSync(filepath) {
	if (fs.existsSync(filepath)) {
		return filepath;
	}

	// Recursively create the parent directory, then this directory
	mkdirsSync(path.dirname(filepath));
	fs.mkdir(filepath);
	return filepath;
};
