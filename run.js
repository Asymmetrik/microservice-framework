#!/usr/bin/env node

var program = require('commander'),
	path = require('path'),
	fs = require('fs'),
	q = require('q'),
	_ = require('lodash');


var stat = q.denodeify(fs.stat);
var readdir = q.denodeify(fs.readdir);
var readfile = q.denodeify(fs.readFile);
var writefile = q.denodeify(fs.writeFile);

function exists(filepath) {
	return q.when(fs.existsSync(filepath));
}

/**
 * Create a directory and any of its parent directories that don't already exist.
 * @param {string} filepath The absolute path of the directory
 * @returns {Promise} A promise that returns the filepath
 */
function mkdirs(filepath) {
	if (fs.existsSync(filepath)) {
		console.log(filepath, '(existing directory)');
		return q.when(filepath);
	}
	// Recursively make any parent directories
	return mkdirs(path.dirname(filepath))
		.then(function() {
			return q.ninvoke(fs, 'mkdir', filepath);
		})
		.then(function() {
			console.log(filepath, '(created directory)');
			return filepath;
		});
}

/**
 * Replace parameters with options
 */
function replaceOptions(options, data) {
	return q.when(
		_.reduce(options, function(accumulator, value, key) {
			return accumulator.replace(new RegExp('\\\[\\\[ ' + key + ' \\\]\\\]', 'g'), value);
		}, data)
	);
}

function copy(sourcePath, targetPath, options) {
	// Make sure absolute paths have been resolved and end in /
	sourcePath = path.resolve(sourcePath);
	targetPath = path.resolve(targetPath);

	function copyFiles(filepath) {

		// Determine the new absolute path to which we will copy this file or directory
		var oldfilepath = sourcePath + filepath;
		var newfilepath = targetPath + filepath;

		// Is the path a file or directory?
		return stat(oldfilepath)
			.then(function (stats) {
				// If it's a file, copy the file and replace any parameters with the passed-in options
				if (stats.isFile()) {

					// See whether the new file already exists
					return exists(newfilepath)
						.then(function(ex) {
							console.log(newfilepath, ':', ex ? '(overwritten)' : '(created)');
						})
						// Get the files' contents
						.then(readfile.bind(null, oldfilepath, 'utf-8'))

						// Replace placeholder variables
						.then(replaceOptions.bind(null, options))

						// Write to the new location
						.then(writefile.bind(null, newfilepath));
				}
				else if (stats.isDirectory()) {

					// Make sure the directory exists in the destination
					return mkdirs(newfilepath)

						// Get everything in the directory
						.then(function() {
							return readdir(oldfilepath)
						})

						// Recursively copy all the files to the new location
						.then(function(files) {
							return q.all(_.map(files, function (file) {
								return copyFiles(filepath + '/' + file);
							}));
						});
				}
				// It's neither a file nor directory, ignore it
				return q.when();
			});
	}
	// Start from the top of the source directory
	return copyFiles('');
}

var ran = false;

var version = require('./package.json').version;
program.version(version);

program.command('generate <service-name>')
	.alias('g')
	.description('Generate a template microservice')
	.action(function(serviceName) {
		ran = true;
		var options = this.opts();
		options.serviceName = serviceName;
		options.msfDirectory = path.resolve(__dirname);
		options.cwdDirectory = path.resolve('.');

		console.log(options);

		return q.when()
			.then(function() {
				copy(__dirname + '/template', '.', options);
			})
			.then(function() {
				copy(__dirname + '/app-template', './app/' + serviceName, options);
			})
			.catch(function(err) {
				console.err(err);
				return q.reject(err);
			})
			.done();
	});

program
	.action(function() {
		program.help();
	});

program.parse(process.argv);

if (!ran) {
	program.help();
}