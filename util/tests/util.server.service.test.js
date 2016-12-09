'use strict';

/** @module util/tests/query */

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	_ = require('lodash'),
	path = require('path'),
	q = require('q'),
	should = require('should'),

	deps = require(path.resolve('./config/dependencies.js')),
	util = deps.utilService;

/**
 * Tests
 */

describe('Util Server Service Tests:', function() {
	it('should strip protocol from a url', function(done) {
		util.stripProtocol('http://www.google.com').should.equal('google.com');
		util.stripProtocol('https://www.google.com').should.equal('google.com');
		util.stripProtocol('http://google.com').should.equal('google.com');
		util.stripProtocol('https://google.com').should.equal('google.com');
		util.stripProtocol('http://whatever.google.com').should.equal('whatever.google.com');
		done();
	});
});
