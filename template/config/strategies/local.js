'use strict';

/** @module config/strategies/local */

/**
 * Module dependencies.
 */
var passport = require('passport'),
	mongoose = require('mongoose'),
	LocalStrategy = require('passport-local').Strategy,
	User = mongoose.model('User');

/**
 * @function local
 * @summary local strategy for passport
 */
module.exports = function() {
	// Use local strategy
	passport.use(new LocalStrategy({
			usernameField: 'username',
			passwordField: 'password'
		},
		function(username, password, done) {

			User.findOne({
				username: username
			}, function(err, user) {
				// Error from the system
				if (err) {
					return done(err);
				}

				// The user wasn't found
				if (!user) {
					return done(null, false, {
						message: 'Unknown user'
					});
				}

				if (user.isLocked()) {
					var secondsUntilUnlocked = Math.floor((user.lockTimeout - Date.now()) / 1000);
					return done(null, false, {
						message: 'Account is locked. Please try again in ' + secondsUntilUnlocked + ' seconds',
						lockoutDate: user.lockTimeout
					});
				}

				// The password is wrong
				if (!user.authenticate(password)) {
					user.increaseLockout(function(error) {
						return done(null, false, {
							message: 'Invalid password'
						});
					});
					return;
				}

				// Return the user
				user.resetLockout(function(error){
					return done(null, user);
				});
			});

		}

	));
};
