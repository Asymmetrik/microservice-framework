#!/usr/bin/env node

var program = require('commander'),
	path = require('path'),
	fs = require('fs'),
	q = require('q'),
	checksum = require('checksum'),
	_ = require('lodash');


var stat = q.denodeify(fs.stat),
	readdir = q.denodeify(fs.readdir),
	readfile = q.denodeify(fs.readFile),
	writefile = q.denodeify(fs.writeFile),
	checkdata = q.denodeify(checksum),
	checkfile = q.denodeify(checksum.file);

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
		return q.when(filepath);
	}
	// Recursively make any parent directories
	return mkdirs(path.dirname(filepath))
		.then(function() {
			return q.ninvoke(fs, 'mkdir', filepath);
		})
		.then(function() {
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
					var mode = stats.mode & 0777;

					return q.when()

						// Get the file's contents
						.then(readfile.bind(null, oldfilepath, 'utf-8'))

						// Replace placeholder variables
						.then(replaceOptions.bind(null, options))

						// See whether the new file already exists and if so, compare
						.then(function(data) {

							return q.all([
								data,

								// If the file already exists, get its checksum
								exists(newfilepath)
									.then(function(ex) {
										return ex ? checkfile(newfilepath) : q.when(null);
									}),

								// Get the checksum of the new data to write
								checksum(data)
							]);
						})

						// Compare the checksums
						.spread(function(data, prevcs, newcs) {

							// The file does not already exist
							if (!prevcs) {
								console.log(newfilepath, ' (creating with mode', mode.toString(8), ')');
							}
							// The file has changed
							else if (prevcs != newcs) {
								if (options.force) {
									console.log(newfilepath, ' (overwriting)');
								}
								else {
									console.log(newfilepath, ' (file changed, use --force to overwrite)');
									return q.when();
								}
							}
							// The file has not changed, so don't bother saving
							else {
								return q.when();
							}

							// Write to the new location with the same file permissions
							return writefile(newfilepath, data, { mode: mode });
						});
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
	.option('-f, --force', 'Force files to be overwritten')
	.action(function(serviceName) {
		ran = true;
		var options = this.opts();
		options.serviceName = serviceName;
		options.msfDirectory = path.resolve(__dirname);
		options.cwdDirectory = path.resolve('.');

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