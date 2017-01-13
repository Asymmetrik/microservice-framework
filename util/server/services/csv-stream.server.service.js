'use strict';

/** @module util/services/csvstream */

const through2 = require('through2'),
	stringify = require('csv-stringify'),
	jsonpath = require('JSONPath'),
	pipe = require('multipipe'),
	logger = require('../../../lib/logger');

/**
 * @function csv-stream
 * @static
 * @summary Takes a stream of Mongo objects and outputs a serialized CSV file.
 * Handles errors/cancellation by the client
 * @param req {express.request}  the request object
 * @param res {express.response} the response object
 * @param stream {Stream}  the stream of mongo objects
 * @param filename {string}  the name you want to give the generated csv file
 * @param columns {Array.<Object>} An array defining the columns to output in the CSV, in order.
 *   Each object must contain:
 *     - key: A JSONPath selector to get the value for this column from the object
 *     - title: The title to use in the CSV header for the column
 *     - callback: Optionally, a function to do further processing of the value.  It must accept a value
 *         and optionally a chunk, and return a value.
 * @param delay {number} This is an optional parameter. If a delay is provided, buffer the processing of each
 *   chuck by the given amount.
 * @param appendStream {Stream} This is an optional parameter.
 *   If specified, the contents of this stream will be passed through the CSV stringify pipe and appended to the
 *   HTTP response.
 */
module.exports = function(req, res, stream, filename, columns, delay, appendStream) {
	// these are required fields
	if (!req || !res || !stream || !filename || !columns) {
		return;
	}

	// Set up the streaming response
	res.set('Content-Type', 'text/csv;charset=utf-8');
	res.set('Content-Disposition', 'attachment;filename=' + filename);
	res.set('Transfer-Encoding', 'chunked');

	// Buffer the stream if we have a delay
	let curStream = stream;
	if(delay && delay > 0) {
		// Store all the active timeouts
		let timeouts = [];

		// Flush function: wait until all the timeouts are done before we forward the finish command
		let onFlush = function(callback) {
			// If there are still pending requests, check again soon
			if (timeouts.length > 0) {
				setTimeout(function() {
					onFlush(callback);
				}, delay + 10);
			}
			// We're done with all the requests
			else {
				callback();
			}
		};

		// Create a stream that applies a timeout to each payload.
		let delayStream = through2.obj(function (chunk, enc, callback) {
			// After a delay, pass the chunk on to the next stream handler
			let t = setTimeout(function() {
				timeouts.splice(timeouts.indexOf(t), 1);
				callback(null, chunk);
			}, delay);
			timeouts.push(t);
		}, onFlush);

		// If an upstream processor has an error, stop doing anything we had queued up.
		// This allows us to quickly short-circuit.
		delayStream.on('error', function() {
			timeouts.forEach(function(t) {
				clearTimeout(t);
			});
			timeouts = [];
		});

		// Buffer the stream to lower its execution priority
		curStream = stream.pipe(delayStream);
	}

	// If an error occurs, close the stream
	stream.on('error', function(err) {
		logger.error(err, 'CSV export error occurred');
		// Short-circuit the delayed stream
		curStream.emit('error', err);
		// End the download
		res.end();
	});

	// If the client drops the connection, stop processing the stream
	req.on('close', function() {
		logger.info('CSV export aborted because client dropped the connection');
		if (stream != null) {
			stream.destroy();
			// Short-circuit the delayed stream
			curStream.emit('error', new Error('Aborted by client'));
		}
		// End the download.  This should not be necessary, but just in case...
		res.end();
	});

	// Create a stream to turn Mongo records into CSV rows
	let csvStream = through2.obj(function (chunk, enc, callback) {
		let row = [];

		// Turn Mongo models into actual objects so JSONPath can work with them
		if (null != chunk.toObject) {
			chunk = chunk.toObject();
		}

		columns.forEach(function (column) {
			if (column.hasOwnProperty('key')) {
				// Get the value from the object using jsonpath
				let value = jsonpath.eval(chunk, '$.' + column.key);

				// Get the first returned value
				if (value.length > 0) {
					value = value[0];
				}
				else {
					value = null;
				}

				// Invoke any callback associated with the column
				if (column.hasOwnProperty('callback')) {
					value = column.callback(value, chunk);
				}

				// Emit a blank column rather than null
				if (null == value) {
					value = '';
				}
				row.push(value);
			}
		});

		// Emit the row to the output stream, piped to the CSV stringifier
		callback(null, row);
	});

	// Parse the columns array into a format the CSV stringify module is expecting
	let csvColumns = [];
	columns.forEach(function(value) {
		if (value.hasOwnProperty('title')) {
			csvColumns.push(value.title);
		}
	});

	// Assemble the CSV headers and stream the CSV response back to the client
	let csv = stringify({
		header: true,
		columns: csvColumns
	});

	// Create an output stream piping the parsing stream to the CSV stream
	let out = pipe(csvStream, csv);
	out.on('error', function(err) {
		logger.err(err, 'Failed to create CSV');
	});

	// Write the stream to the HTTP response
	curStream.pipe(out).pipe(res);

	// If a callback was provided, invoke it when the stream has ended
	if (appendStream) {
		out.on('end', function() {
			pipe(appendStream, stringify()).pipe(res);
		});
	}
};