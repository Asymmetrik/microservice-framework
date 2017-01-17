'use strict';

/** @module util/services/email */

const path = require('path'),
	_ = require('lodash'),
	glob = require('glob'),
	proxyquire = require('proxyquire'),
	config = require('../../../lib/config'),
	{logger} = require('../../../lib/logger');

exports.testingDependencies = [];
const mockServiceRegistry = {};
const mockServices = {};
const regex = /(.*)\/server\/.*\/(.*).js/;

exports.getDependencyList = function(filePath) {
	try {
		const dependency = require(path.resolve(filePath));
		return dependency.testingDependencies || [];
	}
	catch (err) {
		logger.error(`Failed to retrieve dependencies from "${filePath}"`);
	}
};

exports.getMockPath = function(str) {
	if (str.match(regex)) {
		return str.replace(regex, '$1' + '/tests/server/mocks/' + '$2' + '.mock.js');
	}
	return str;
};

exports.mockFile = function(filePath, proxyAccessMethods) {
	const mockPath = exports.getMockPath(filePath);
	const proxyOptions = {};
	let fileMethods = {};
	proxyAccessMethods = proxyAccessMethods || {};

	try {
		fileMethods = require(path.resolve(mockPath));
	} catch(err) {
		logger.error(err);
	} // Do nothing, this means no file exists.

	const dependencies = exports.getDependencyList(filePath);
	_.each(dependencies, function(dependency) {
		let key = dependency;
		let options = exports.getExternalMock(key);

		// This is not an external mock, must be a file.
		if (!options) {
			key = path.resolve(dependency);
			options = exports.mockFile(dependency, proxyAccessMethods);
		}

		if (options != null && options.proxyAccessMethods) {
			proxyAccessMethods = _.extend(proxyAccessMethods, options.proxyAccessMethods);
		}

		proxyOptions[key] = options;
	});


	// Append access methods to mocked file, so the test has the ability to access / modify data
	let ret = proxyquire(path.resolve(filePath), proxyOptions);
	ret = _.extend(ret, proxyAccessMethods, fileMethods);
	return ret;
};

exports.getExternalMock = function(name, reload) {
	if (mockServiceRegistry[name]){
		return mockServiceRegistry[name];
	}
	if (!mockServiceRegistry[name] || reload) {
		if (!mockServices[name]) {
			logger.error(`External mock ${name} was not registered with the moxiequire service.`);
			return null;
		}
		try {
			mockServiceRegistry[name] = mockServices[name]();
			return mockServiceRegistry[name];
		}
		catch (err) {
			logger.error(`Failed to retrieve external mock: ${name}`);
			return null;
		}
	}
};

function initMoxiequire() {
	/**
	 * The glob search and callback will pull in internal (microservice-framework) moxiequire files
	 * to register with the moxiequire service.
	 */
	glob('../../tests/moxiequire/*.moxiequire.js',{cwd: __dirname, absolute: true}, (err, matches) => {
		if (err) {
			logger.error(err);
		}
		_.each(matches, (match) => {
			const factory = require(path.resolve(match));
			_.assign(mockServices, factory);
		});

		/**
		 * This conditional block will pull in external (host application) moxiequire files
		 * and will override any factory methods with the same name.
		 */
		if (config.files.tests.moxiequire) {
			_.each(config.files.tests.moxiequire, function(file) {
				const factory = require(path.resolve(file));
				if (_.hasIn(mockServices, _.keys(factory))) {
					logger.info(`External dependency was reregistered by ${file}`);
				}
				_.assign(mockServices, factory);

			});
		}
	});

}

initMoxiequire();