module.exports = {
	'sqs' : getSqsMock
};

function getSqsMock() {

	const _ = require('lodash'),
		q = require('q'),
		// Random delays to simulate call time
		lowerBoundCallTime = 30,
		upperBoundCallTime = 250,
		visibilityTimeout = 30;


	class SQS {
		/**
		 * Example queue object:
		 * { Messages: [
		   {
		  Attributes: {
		   "ApproximateFirstReceiveTimestamp": "1442428276921",
		   "ApproximateReceiveCount": "5",
		   "SenderId": "AIDAIAZKMSNQ7TEXAMPLE",
		   "SentTimestamp": "1442428276921"
		  },
		  Body: "My first message.",
		  MD5OfBody: "1000f835...a35411fa",
		  MD5OfMessageAttributes: "9424c491...26bc3ae7",
		  MessageAttributes: {
		   "City": {
			 DataType: "String",
			 StringValue: "Any City"
			},
		   "PostalCode": {
			 DataType: "String",
			 StringValue: "ABC123"
			}
		  },
		  MessageId: "d6790f8d-d575-4f01-bc51-40122EXAMPLE",
		  ReceiptHandle: "AQEBzbVv...fqNzFw=="
		 }
		]}
		 */
		constructor(params) {
			this._uuidCounter = 0;
			// The avaiable queue are any items currently ready to be read
			this._availableQueue = {order: []};
			// The polling queue are any messages currently being polled and must wait to be polled again
			this._pollingQueue = {order: []};
		}

		_getAUuid() {
			return this._uuidCounter++;
		}

		/**
		 * @function _swapQueues
		 * @summary Swaps the message by hash from one queue to the other
		 * @param toQueue {}
		 * @param fromQueue {}
		 * @param message {}
		 * @private
		 */
		_swapQueues(toQueue, fromQueue, message) {
			toQueue.order.push(this._getHandle(message));
			toQueue[this._getHandle(message)] = message;
			delete fromQueue[this._getHandle(message)];
			_.pull(fromQueue.order, this._getHandle(message));
		}

		/**
		 * @function _randomCallWait
		 * @summary return a random time between the uppoer and lower call times
		 * @return {number}
		 * @private
		 */
		_randomCallWait() {
			return _.random(lowerBoundCallTime, upperBoundCallTime);
		}

		/**
		 * @function _getHandle
		 * @summary returns the ReceiptHandle of the message or an empty string is one is not available
		 * @param message
		 * @return {*|string}
		 * @private
		 */
		_getHandle(message) {
			return message.ReceiptHandle || '';
		}

		/**
		 * @function _getMessageFromQueue
		 * @summary Retrieves up to 10 messages from the queue and returns them in the callback. The messages are then held
		 * from the queue until the wait time is up before they can be retrieved again
		 * @param MaxNumberOfMessages
		 * @param WaitTimeSeconds
		 * @param VisibilityTimeout
		 * @param Attributes
		 * @param MessageAttributeNames
		 * @param cb
		 * @private
		 */
		_getMessageFromQueue({
			MaxNumberOfMessages = 0,
			WaitTimeSeconds = 2,
			VisibilityTimeout = visibilityTimeout,
			Attributes = 'All',
			MessageAttributeNames = 'All'
		}, cb) {
			MaxNumberOfMessages = Math.min(MaxNumberOfMessages, 10);

			const messagesHashes = _.take(this._availableQueue.order, MaxNumberOfMessages),
				messages = [];

			for (const hash of messagesHashes) {
				messages.push(this._availableQueue[hash]);
				this._swapQueues(this._pollingQueue, this._availableQueue, this._availableQueue[hash]);
			}

			// Return the data after the poll time finishes
			setTimeout(() => {
				cb(null, messages);
			}, WaitTimeSeconds * 1000);

			// After the visibility timeout, the message will be available for polling again
			setTimeout((function () {
				for (const message of messages) {
					this._swapQueues(this._availableQueue, this._pollingQueue, message);
				}
			}).bind(this), (WaitTimeSeconds + VisibilityTimeout) * 1000);
		}

		/**
		 * @function _deleteMessageFromQueue
		 * @summary removes a message by hash from the queue
		 * @param ReceiptHandle
		 * @param cb
		 * @return {*}
		 * @private
		 */
		_deleteMessageFromQueue({
			ReceiptHandle = ''
		}, cb) {
			if (ReceiptHandle === 'order') return cb('Invalid Receipt Handle');

			_.pull(this._availableQueue.order, ReceiptHandle);
			delete this._availableQueue[ReceiptHandle];
			_.pull(this._pollingQueue.order, ReceiptHandle);
			delete this._pollingQueue[ReceiptHandle];

			cb();
		}

		/**
		 * @function _addMessageToQueue
		 * @summary adds the message from the parameters to the queue
		 * @param params
		 * @param cb
		 * @private
		 */
		_addMessageToQueue(params, cb) {
			params.DelaySeconds = params.DelaySeconds || 0;
			params.ID = params.ID || new Date().getTime();
			params.MessageAttributes = params.MessageAttributes || {};
			params.MessageBody = params.MessageBody || '';
			params.ReceiptHandle = this._getAUuid();

			this._availableQueue[params.ReceiptHandle] = params;
			this._availableQueue.order.push(params.ReceiptHandle);

			cb(null, {success: true});
		}

		/**
		 * @function receiveMessage
		 * @summary Adds the message to queue with a random wait to emulate wait time
		 * @param params
		 * @param cb
		 */
		receiveMessage(params, cb) {
			setTimeout(() => {
				this._getMessageFromQueue(params, cb);
			}, this._randomCallWait());
		}

		/**
		 * @function deleteMessage
		 * @summary Removes a message from the queue
		 * @param params
		 * @param cb
		 */
		deleteMessage(params, cb) {
			setTimeout(() => {
				this._deleteMessageFromQueue(params, cb);
			}, this._randomCallWait());
		}

		/**
		 * @function sendMessageBatch
		 * @summary Send a group of messages to the queue
		 * @param Entries
		 * @param cb
		 */
		sendMessageBatch({
			Entries = []
		}, cb) {
			setTimeout(() => q.allSettled(_.map(Entries, (message) => q.ninvoke(this, '_addMessageToQueue', message))).then(cb), this._randomCallWait());
		}

		/**
		 * @function getQueueAttributes
		 * @summary Returns the requested attributes to the queue
		 * @param AttributeNames
		 * @param cb
		 */
		getQueueAttributes({
			AttributeNames = []
		}, cb) {
			const attributes = {};

			for (const attribute of AttributeNames) {
				if (attribute === 'ApproximateNumberOfMessages') {
					attributes.ApproximateNumberOfMessages = this._availableQueue.order.length + this._pollingQueue.order.length;
				}
			}
			setTimeout(() => {
				cb(null, {Attributes: attributes});
			}, this._randomCallWait());
		}
	}
	const fakeSQS = new SQS();
	return {
		/**
		 * @function getSQSEmulator
		 * @summary returns the sqs emulator used by the consumer and producer
		 * @return {SQS}
		 */
		getSQSEmulator() {
			return fakeSQS;
		},

		/**
		 * @function getConsumer
		 * @summary Returns an sqs consumer with the fake sqs service
		 * @param options
		 * @param consumer: sqs consumer to use
		 * @return {*}
		 */
		getConsumer: function(options, consumer) {
			if (!_.isObject(options)) return null;

			// Keep the consumer but override the sqs object
			options.sqs = fakeSQS;

			return consumer.create(options);
		},

		/**
		 * @function getProducer
		 * @summary Return an sqs producer with the fake sqs service
		 * @param options
		 * @param producer
		 * @return {*}
		 */
		getProducer(options, producer) {
			if (!_.isObject(options)) return null;

			// Keep the consumer but override the sqs object
			options.sqs = fakeSQS;

			return producer.create(options);
		}
	};


}
