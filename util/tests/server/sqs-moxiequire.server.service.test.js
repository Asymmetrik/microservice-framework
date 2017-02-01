'use strict';
const should = require('should'),
	_ = require('lodash'),
	q = require('q'),
	moxiequire = require('../../../main').moxiequire(),
	SQS = moxiequire.getExternalMock('sqs');

const clearDatabase = function clearDatabase () {
	// For now nothing to clear
	return q.all([]);
};

const handleErr = (done) => {
	return (err) => {
		done(err ? err : 'Unknown Test Error occured');
	};
};

let sqs = undefined;
const messages = [
		{
			Body: 'My first message.',
			MessageAttributes: {
				'City': {
					DataType: 'String',
					StringValue: 'Any City'
				},
				'PostalCode': {
					DataType: 'String',
					StringValue: 'ABC123'
				}
			},
			MessageId: '1'
		},
		{
			Body: 'My second message.',
			MessageAttributes: {
				'City': {
					DataType: 'String',
					StringValue: 'Any City'
				},
				'PostalCode': {
					DataType: 'String',
					StringValue: 'ABC123'
				}
			},
			MessageId: 'd6790f8d-d575-4f01-bc51-40122EXAMPLE'
		},
		{
			Body: 'My third message.',
			MessageAttributes: {
				'City': {
					DataType: 'String',
					StringValue: 'Any City'
				},
				'PostalCode': {
					DataType: 'String',
					StringValue: 'ABC123'
				}
			},
			MessageId: '3'
		},
		{
			Body: 'My fourth message.',
			MessageAttributes: {
				'City': {
					DataType: 'String',
					StringValue: 'Any City'
				},
				'PostalCode': {
					DataType: 'String',
					StringValue: 'ABC123'
				}
			},
			MessageId: '4'
		},
		{
			Body: 'My fifth message.',
			MessageAttributes: {
				'City': {
					DataType: 'String',
					StringValue: 'Any City'
				},
				'PostalCode': {
					DataType: 'String',
					StringValue: 'ABC123'
				}
			},
			MessageId: '5'
		}
	];

describe('SQS-Moxiequire Unit Tests', function () {

	before(function (done) {
		clearDatabase().then(function () {
			done();
		});
	});

	describe('Method: getSQSEmulator', function () {
		it('should return a non null object', function (done) {
			sqs = SQS.getSQSEmulator();

			should(_.isObject(sqs)).equal(true);
			done();
		});

		it('should start with no objects in the queue', function (done) {
			const availableQueueLength = _.get(sqs, '_availableQueue.order.length', 1),
				pollingQueueLength = _.get(sqs, '_pollingQueue.order.length', 1);

			should(availableQueueLength + pollingQueueLength).equal(0);
			done();
		});
	});

	describe('Method: _getAuid', function () {
		it('should return unique IDs', function (done) {
			const uids = {};
			let uid;

			// Create 10,000 uid's and all should be unique
			// it is unlikely this function will be used more than 10,000 times for testing
			for (let i=10000; i--;) {
				uid = sqs._getAUuid();
				if (uids[uid]) {
					should(false).equal(true);
					break;
				}

				uids[uid] = true;
			}
			should(_.isObject(sqs)).equal(true);
			done();
		});
	});

	describe('Method: _getHandle', function () {
		it('Return a valid handle', function (done) {
			const goodHandle = sqs._getHandle({ReceiptHandle: 'test'}),
				badHandle = sqs._getHandle({});

			should(goodHandle).equal('test');
			should(badHandle).equal('');

			done();
		});
	});

	describe('Method: _addMessageToQueue', function () {
		it('should add messages to the available queue', function (done) {
			for (let i = 0; i < 5; i++) {
				sqs._addMessageToQueue(messages[i], () => {
					const availableQueueLength = _.get(sqs, '_availableQueue.order.length', 10),
						pollingQueueLength = _.get(sqs, '_pollingQueue.order.length', 10);

					should(availableQueueLength + pollingQueueLength).equal(i+1);
				});
			}

			done();
		});
	});

	describe('Method: _deleteMessageFromQueue', function () {
		it('should remove messages from the available queue', function (done) {
			for (let i = 4; i >=0; i--) {
				sqs._deleteMessageFromQueue(messages[i], () => {
					const availableQueueLength = _.get(sqs, '_availableQueue.order.length', 10),
						pollingQueueLength = _.get(sqs, '_pollingQueue.order.length', 10);

					should(availableQueueLength + pollingQueueLength).equal(i);
				});
			}

			done();
		});

		it('should remove messages from both queues', function (done) {
			for (let i = 0; i < 3; i++) {
				sqs._addMessageToQueue(messages[i], () => {return;});
			}
			sqs._pollingQueue.order.push(messages[3].ReceiptHandle);
			sqs._pollingQueue[messages[3].ReceiptHandle] = messages[3];
			sqs._pollingQueue.order.push(messages[4].ReceiptHandle);
			sqs._pollingQueue[messages[4].ReceiptHandle] = messages[4];


			for (let i = 4; i >=0; i--) {
				sqs._deleteMessageFromQueue(messages[i], () => {
					const availableQueueLength = _.get(sqs, '_availableQueue.order.length', 10),
						pollingQueueLength = _.get(sqs, '_pollingQueue.order.length', 10);

					should(availableQueueLength + pollingQueueLength).equal(i);
				});
			}

			done();
		});
	});

	describe('Method: _getMessageFromQueue', function () {
		it('should get up to 10 messages from the queue', function (done) {
			for (let i = 0; i < messages.length; i++) {
				sqs._addMessageToQueue(messages[i], () => {return;});
			}

			const timeout = 500,
				query = {
				MaxNumberOfMessages: 100,
				WaitTimeSeconds: .125,
				VisibilityTimeout: .1
			};

			sqs._getMessageFromQueue(query, (err, results) => {
				should(err).equal(null);
				should(results).not.equal(null);
				results.Messages.should.have.lengthOf(Math.min(messages.length, 10));
				setTimeout(done, timeout);
			});

		});

		it('should move the retrieved messages to the polling queue', function (done) {
			const timeout = 500,
				query = {
					MaxNumberOfMessages: 100,
					WaitTimeSeconds: .125,
					VisibilityTimeout: .375
				};

			sqs._getMessageFromQueue(query, (err, results) => {
				should(sqs._availableQueue.order).have.lengthOf(0);
				should(sqs._pollingQueue.order).have.lengthOf(5);
				setTimeout(() => {
					done();
				}, timeout);
			});

		});

		it('should move the polled messages back to the available queue when appropriate', function (done) {
			const timeout = 750,
				waitTimeout = .25,
				query = {
					MaxNumberOfMessages: 100,
					WaitTimeSeconds: .125,
					VisibilityTimeout: waitTimeout
				};

			sqs._getMessageFromQueue(query, (err, results) => {
				setTimeout(() => {
					should(sqs._availableQueue.order).have.lengthOf(5);
					should(sqs._pollingQueue.order).have.lengthOf(0);
					done();
				}, timeout);
			});

		});
	});

	describe('Method: getQueueAttributes', function () {
		it('should be able to return the correct queue size', function (done) {
			for (let i = 4; i >=0; i--) {
				sqs._deleteMessageFromQueue(messages[i], () => {
				});
				sqs.getQueueAttributes({AttributeNames: ['ApproximateNumberOfMessages']}, (err, attributes) => {
					const x = i;
					should(_.get(attributes, 'Attributes.ApproximateNumberOfMessages', -1)).equal(x);

					if (!x) done();
				});
			}

		});
	});

	describe('Method: sendMessageBatch', function () {
		it('should be able to add all messages as a batch', function (done) {
			for (const message of messages) {
				sqs._deleteMessageFromQueue(message, () => {});
			}
			sqs.sendMessageBatch({Entries: messages}, () => {
				try {
					should(sqs._availableQueue.order).have.lengthOf(messages.length);
					done();
				}catch(e){
					done(e);
				}
			});
		});
	});

	after(function (done) {
		clearDatabase().then(function () {
			done();
		}).catch(handleErr(done));
	});

});
