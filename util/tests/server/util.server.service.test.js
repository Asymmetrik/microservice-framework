'use strict';

/** @module util/tests/query */

/**
 * Module dependencies.
 */
const	should = require('should'),
	util = require('../../../main').util;

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
