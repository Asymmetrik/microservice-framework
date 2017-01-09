'use strict';

/** @module util/tests/query */

/**
 * Module dependencies.
 */
let should = require('should'),
	queryService = require('../../main').query;

/**
 * Tests
 */

describe('Query Server Service Tests:', function() {

	it('should format parameters', function(done) {
		// Test ObjectId conversion
		let param1 = queryService.formatQueryParam({ project: {value: '5702c24b41ef4dce67d2dfba', dataType: 'ObjectId'}});
		param1.project._bsontype.should.equal('ObjectID');
		param1.project.toString().should.equal('5702c24b41ef4dce67d2dfba');

		// Test Date conversion
		let date = new Date();
		let param2 = queryService.formatQueryParam({ created: { $gte: {value: date.toString(), dataType: 'date'} } });
		param2.created.$gte.getMonth().should.equal(date.getMonth());
		param2.created.$gte.getDate().should.equal(date.getDate());
		param2.created.$gte.getFullYear().should.equal(date.getFullYear());
		param2.created.$gte.getMinutes().should.equal(date.getMinutes());

		// Test direct number value
		let param3 = queryService.formatQueryParam({blah: 1});
		param3.blah.should.equal(1);

		// Test direct string value
		let param4 = queryService.formatQueryParam({blah: 'whee'});
		param4.blah.should.equal('whee');

		// Test nested query params with date, and objectID conversions
		let startDate = new Date(date.getDate()-5);
		let param5 = queryService.formatQueryParam({
			$and: [
				{ created: { $gte: { value: new Date(startDate).toString(), dataType: 'date'} } },
				{ created: { $lt: { value: date.toString(), dataType: 'date' } } },
				{ project: {value: '5702c24b41ef4dce67d2dfba', dataType: 'ObjectId'} }
			]
		});
		param5.$and[0].created.$gte.getMonth().should.equal(startDate.getMonth());
		param5.$and[0].created.$gte.getDate().should.equal(startDate.getDate());
		param5.$and[0].created.$gte.getFullYear().should.equal(startDate.getFullYear());
		param5.$and[0].created.$gte.getMinutes().should.equal(startDate.getMinutes());
		param5.$and[1].created.$lt.getMonth().should.equal(date.getMonth());
		param5.$and[1].created.$lt.getDate().should.equal(date.getDate());
		param5.$and[1].created.$lt.getFullYear().should.equal(date.getFullYear());
		param5.$and[1].created.$lt.getMinutes().should.equal(date.getMinutes());
		param5.$and[2].project._bsontype.should.equal('ObjectID');
		param5.$and[2].project.toString().should.equal('5702c24b41ef4dce67d2dfba');

		// Test empty object
		let param6 = queryService.formatQueryParam({});
		(typeof param6).should.equal('object');
		Object.keys(param6).length.should.equal(0);

		// Test null object
		let param7 = queryService.formatQueryParam();
		(param7 === null).should.equal(true);

		// Null value
		let param8 = queryService.formatQueryParam({testing: null});
		(param8 === null).should.equal(true);

		// Test invalid date
		try {
			queryService.formatQueryParam({ project: {value: {whatever: 1}, dataType: 'date'}});
		}
		catch(err) {
			err.message.should.equal('Invalid Date');
		}

		// Test invalid ObjectID
		try {
			queryService.formatQueryParam({ project: {value: {whatever: 1}, dataType: 'ObjectId'}});
		}
		catch(err) {
			err.message.should.equal('Argument passed in must be a single String of 12 bytes or a string of 24 hex characters');
		}

		done();
	});

	it('should delete dangerous mongo query keys', function(done) {
		// Test blacklisted phrase '$where'
		let param1 = queryService.formatQueryParam({ $where: 'stuff' });
		(param1 === null).should.equal(true);

		// Test blacklisted phrase 'mapReduce'
		let param2 = queryService.formatQueryParam({ mapReduce: 'stuff' });
		(param2 === null).should.equal(true);

		// Test blacklisted phrase 'group'
		let param3 = queryService.formatQueryParam({ group: 'stuff' });
		(param3 === null).should.equal(true);

		// Test nested query with dangerous keys
		let param4 = queryService.formatQueryParam({
			$or: [
				{$and: [
					{ test: 1 },
					{ $where: 'stuff'}
				]}
			]
		});
		param4.$or[0].$and.length.should.equal(1);
		param4.$or[0].$and[0].test.should.equal(1);
		(param4.$or[0].$and[0].$where === undefined).should.equal(true);

		done();
	});

});
