'use strict';

/** @module lib/passport */

var passport = require('passport'),
	User = require('mongoose').model('User'),
	config = require('./config'),
	fileutil = require('./file');

/**
 * @function init
 * @static
 * @summary Initialize passport
 */
module.exports.init = function() {
	// Serialize sessions
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	// Deserialize sessions
	passport.deserializeUser(function(id, done) {
		User.findOne({
			_id: id
		}, '-salt -password', function(err, user) {
			done(err, user);
		});
	});

	// Initialize strategies
	fileutil.getGlobbedPaths('./config/strategies/**/*.js').forEach(function(strategy) {
		require(path.resolve(strategy))();
	});
};