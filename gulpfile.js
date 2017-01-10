'use strict';

/**
 * Module dependencies.
 */
let _ = require('lodash'),
	runSequence = require('run-sequence'),
	gulp = require('gulp'),
	plugins = require('gulp-load-plugins')(),
	argv = require('yargs').argv,
	msf = require('./main'),
	logger = msf.logger;

/**
 * Print the error to console and exit(-1)
 * @param  {Error} err
 */
var handleError = function handleError(err) {
	logger.error(err.toString());
	process.exit(1);
};

/*
 * Build tasks
 */

// JS linting task
gulp.task('eslint', function () {
	return gulp.src(
		_.union(
			msf.config.files.server.allJS,
			msf.config.files.tests.server
		))
		.pipe(plugins.eslint())
		.pipe(plugins.eslint.format())
		.on('error', plugins.util.log);
});

// Lint JavaScript files.
gulp.task('lint', ['eslint']);

// Build javascript docs
gulp.task('jsdoc', plugins.shell.task(['npm run jsdoc']));

// Lint project files and minify them into two production files.
gulp.task('build', ['lint', 'jsdoc']);

/*
 * Test tasks
 */

// Set NODE_ENV to 'test'
gulp.task('env:test', function (done) {
	process.env.NODE_ENV = 'test';
	done();
});

// Set NODE_ENV to 'test'
gulp.task('env:localtest', function (done) {
	process.env.NODE_ENV = 'localtest';
	done();
});

// Mocha tests task
gulp.task('mocha', ['env:test'], function (done) {
	// Open mongoose connections
	var mongoose = msf.mongoose;

	mongoose.connect().then(function() {
		var sources = argv.f ? [ 'app/**/' + argv.f ] : msf.config.files.tests.server;
		var expect = require('gulp-expect-file');

		gulp.src(sources)
			.pipe(expect(sources))
			.pipe(plugins.mocha({
				bail: argv.bail,
				reporter: 'spec'
			}))
			.on('error', handleError)
			.on('end', function() {
				mongoose.disconnect(done);
			});
	}).catch(handleError);
});


/*
 * These are the main targets of the build
 */
gulp.task('test', function(done) {
	if (argv.h || argv.help) {
		logger.info('---------------------------------------');
		logger.info('Usage: gulp test [options]\n\n\tOptions:\n');
		logger.info('\t-h, --help\t output usage information');
		logger.info('\t-m\t\t run mocha tests*');
		logger.info('\t-d\t\t run jsDoc*');
		logger.info('\t-l\t\t run tests locally*');
		logger.info('\t-f filename\t run tests for files that match this pattern only');
		logger.info('\t--bail\t\t fail on first error (mocha only)');
		logger.info('\t--nomocks\t\t run with actual services where applicable. This should be run before each deployment.');
		logger.info('\n* if no test suites are specified, all tests will be run.');
		logger.info('---------------------------------------');
		return;
	}

	var sequence = argv.l? ['env:localtest']:['env:test'];

	var specifiedTestSuites = argv.m || argv.r ||argv.k || argv.p;
	if (!specifiedTestSuites) { sequence.push('lint'); }
	//if (!specifiedTestSuites || argv.d) { sequence.push('jsdoc'); }
	if (!specifiedTestSuites || argv.m) { sequence.push('mocha'); }

	sequence.push(done);
	runSequence.apply(this, sequence);
});

// Watch Files For Changes
gulp.task('watch', function() {
	// Add watch rules
	gulp.watch(msf.config.files.server.allJS, ['lint']);
});

// Run the project in development mode
gulp.task('default', ['test']);
