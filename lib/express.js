'use strict';

/** @module lib/express */

/**
 * Module dependencies.
 */
var path = require('path'),
	express = require('express'),
	morgan = require('morgan'),
	bodyParser = require('body-parser'),
	session = require('express-session'),
	MongoStore = require('connect-mongo')(session),
	compress = require('compression'),
	methodOverride = require('method-override'),
	cookieParser = require('cookie-parser'),
	helmet = require('helmet'),
//	passport = require('passport'),
	flash = require('connect-flash'),
	path = require('path'),
	config = require('./config'),
	logger = require('./bunyan').logger;


function initProxySettings(app) {
	app.set('trust proxy', config.proxy && config.proxy.behindProxy);
}

/**
 * @summary Setting application local variables
 * @param app {express.app} Express application
 */
function initLocalVariables(app) {
	// Passing the request url to environment locals
	app.use(function (req, res, next) {
		res.locals.host = req.protocol + '://' + req.hostname;
		res.locals.url = req.protocol + '://' + req.headers.host + req.originalUrl;
		next();
	});
}

/**
 * @summary Initialize application middleware
 * @param app {express.app} Express application
 */
function initMiddleware(app) {
	// Showing stack errors
	app.set('showStackError', true);

	// Enable jsonp
	app.enable('jsonp callback');

	// Should be placed before express.static
	app.use(compress({
		level: 9
	}));

	// Environment dependent middleware
	if (config.assets === 'development') {
		// Enable logger (morgan)
		app.use(morgan('dev'));

		// Disable views cache
		app.set('view cache', false);
	}
	else if (config.assets === 'production') {
		app.locals.cache = 'memory';
	}

	// Request body parsing middleware should be above methodOverride
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	app.use(bodyParser.json());
	app.use(methodOverride());

	// Add the cookie parser and flash middleware
	app.use(cookieParser(config.auth.sessionSecret));
	app.use(flash());
}

/**
 * @summary Configure Express session
 * @param app {express.app} Express application
 * @param db {Object} Database
 */
function initSession(app) {
	// Express MongoDB session storage
	app.use(session({
		saveUninitialized: true,
		resave: true,
		secret: config.auth.sessionSecret,
		cookie: config.auth.sessionCookie,
		store: new MongoStore({
			url: config.db,
			collection: config.auth.sessionCollection
		})
	}));
}

/**
 * @summary configure passport
 * @param app {express.app} Express application
 */
function initPassport(app) {
	/*
	 * TODO Figure out how to do user login in microservices
	app.use(passport.initialize());
	app.use(passport.session());

	require(path.resolve('./config/lib/passport.js')).init();
	*/
}

/**
 * @summary Invoke modules server configuration
 * @param app {express.app} Express application
 * @param db {Object} Database
 */
function initModulesConfiguration(app) {
	if (config.files.server.config) {
		config.files.server.config.forEach(function (configPath) {
			require(path.resolve(configPath))(app);
		});
	}
}

/**
 * @summary Configure Helmet headers configuration
 * @param app {express.app} Express app
 */
function initHelmetHeaders(app) {
	// Use helmet to secure Express headers
	app.use(helmet.xframe());
	app.use(helmet.xssFilter());
	app.use(helmet.nosniff());
	app.use(helmet.ienoopen());
	app.disable('x-powered-by');
}

/**
 * @summary Configure the modules ACL policies
 * @param app {express.app}
 */
function initModulesServerPolicies(app) {
	if (config.files.server.policies) {
		config.files.server.policies.forEach(function (policyPath) {
			require(path.resolve(policyPath)).invokeRolesPolicies();
		});
	}
}

/**
 * @summary Configure the modules server routes
 * @param app {express.app}
 */
function initModulesServerRoutes(app) {
	if (config.files.server.routes) {
		config.files.server.routes.forEach(function (routePath) {
			require(path.resolve(routePath))(app);
		});
	}
}

/**
 * @summary Configure error handling
 * @param app
 */
function initErrorRoutes(app) {
	// Assume 'not found' in the error msgs is a 404. this is somewhat silly, but valid, you can do whatever you like, set properties, use instanceof etc.
	app.use(function (err, req, res, next) {
		// If the error object doesn't exists
		if (!err) return next();

		// Log it
		logger.error(err.stack);

		// send server error
		res.status(500).json({ status: 500, type: 'server-error', message: 'Unexpected server error' });
	});

	// Assume 404 since no middleware responded
	app.use(function (req, res) {
		// Send 404 with error message
		res.status(404).json({ status: 404, type: 'not-found', message: 'The resource was not found' });
	});
}

var app = null;

/**
 * @function init
 * @static
 * @summary Initialize the Express application
 * @param db {Database} The Mongo database
 * @returns {express.app}
 */
module.exports.init = function() {

	// Initialize express app
	logger.info('Initializing Express');
	app = express();

	// Initialize proxy settings
	initProxySettings(app);

	// Initialize local variables
	initLocalVariables(app);

	// Initialize Express middleware
	initMiddleware(app);

	// Initialize Express session
	initSession(app);

	// Initialize passport auth
//	initPassport(app);

	// Initialize Modules configuration
	initModulesConfiguration(app);

	// Initialize Helmet security headers
	initHelmetHeaders(app);

	// Initialize modules server authorization policies
	initModulesServerPolicies(app);

	// Initialize modules server routes
	initModulesServerRoutes(app);

	// Initialize error routes
	initErrorRoutes(app);

	return app;
};

module.exports.app = app;