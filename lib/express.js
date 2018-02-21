'use strict';

/** @module lib/express */

/**
 * Module dependencies.
 */
const path = require('path'),
	express = require('express'),
	_ = require('lodash'),
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
	config = require('./config'),
	logger = require('./logger').logger;


function initProxySettings(app) {
	if (config.proxy) {
		app.set('trust proxy', config.proxy && config.proxy.behindProxy);
	}
}

/**
 * @summary Setting application local variables
 * @param app {express.app} Express application
 */
function initLocalVariables(app) {
	// Passing the request url to environment locals
	app.use( (req, res, next) => {
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

function initCaching(app) {
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
}

/**
 * @summary Configure Express session
 * @param app {express.app} Express application
 * @param sessionOverride {express.session} Instance of some type of session object
 * @param db {Object} Database
 */
function initSession(app, sessionOverride) {
	// If a session was provided, use that one
	if (sessionOverride) {
		app.use(sessionOverride);
	}
	// Otherwise use the default
	else {
		// Express MongoDB session storage
		const mongoose = require('./mongoose');
		const mongoStore = new MongoStore({
			mongooseConnection: mongoose.dbs.mongoStore,
			collection: config.auth.sessionCollection
		});
		// TODO Allow this to be configurable to use Redis or MongoStore for session management
		app.use(session({
			secret: config.auth.sessionSecret,
			cookie: config.auth.sessionCookie,
			store: mongoStore,
			saveUninitialized: config.auth.saveUnitialized || true,
			resave: config.auth.resave || true,
			rolling: config.auth.rolling || false
		}));
	}
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
	app.use(helmet());
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
 * @summary Configure error handling.  You should call this last after all routes have been registered.
 * @param app
 */
function initErrorRoutes(app) {
	// Register error-handling middleware
	app.use(function (err, req, res, next) {
		if (!err) return next();

		// Log it
		logger.error(err.stack);

		// Assume 'not found' in the error msgs is a 404. this is somewhat silly, but valid, you can do whatever you like, set properties, use instanceof etc.
		if (err.message === 'not found') {
			// Send 404 with error message
			res.status(404).json({ status: 404, type: 'not-found', message: 'The resource was not found' });
		}
		else {
			// send server error
			res.status(500).json({ status: 500, type: 'server-error', message: 'Unexpected server error' });
		}
	});

	// Assume 404 since no middleware responded
	app.use(function (req, res) {
		// Send 404 with error message
		res.status(404).json({ status: 404, type: 'not-found', message: 'The resource was not found' });
	});
}

let app = null;

/**
 * @callback expressHookCallback
 * @param {express.app} app
 * @param {string} phase
 */

/**
 * @function init
 * @static
 * @summary Initialize the Express application
 * @param {Object} opts - A set of configuration options
 * @param {boolean} [opts.skipCaching] - If true, caching will be disabled
 * @param {expressHookCallback} [opts.callbacks.preroutes] - If specified, this will be called before the routes are setup
 * @param {expressHookCallback} [opts.callbacks.postroutes] - If specified, this will be called after the routes are setup
 *   and before the error routes are defined.
 *
 * @returns {express.app}
 */
module.exports.init = function(opts) {
	opts = _.extend(module.exports.defaultOptions, opts || {});

	// Initialize express app
	logger.info('Initializing Express');
	app = express();

	// Initialize proxy settings
	initProxySettings(app);

	// Initialize local variables
	initLocalVariables(app);

	// Initialize Express middleware
	initMiddleware(app);

	// Initialize cache settings based on assets configuration
	if (!opts.skipCaching) {
		initCaching(app);
	}

	// Initialize Express session
	// Override the default session
	if (opts.session) {
		initSession(app, opts.session);
	}
	else if (!opts.skipSession){
		initSession(app);
	}

	// Initialize Modules configuration
	initModulesConfiguration(app);

	// Initialize Helmet security headers
	initHelmetHeaders(app);

	// Initialize modules server authorization policies
	initModulesServerPolicies(app);

	const preroutes = _.get(opts, ['callbacks', 'preroutes']);
	if (_.isFunction(preroutes)) {
		preroutes(app, 'preroutes');
	}

	// Initialize modules server routes
	initModulesServerRoutes(app);

	const postroutes = _.get(opts, ['callbacks', 'postroutes']);
	if (_.isFunction(postroutes)) {
		postroutes(app, 'postroutes');
	}

	// Initialize the error routes
	initErrorRoutes(app);

	return app;
};

module.exports.defaultOptions = {
	skipCaching: false,
	skipSession: false,
	callbacks: {}
};

module.exports.app = app;
module.exports.initCaching = initCaching;