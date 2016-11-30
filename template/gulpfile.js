'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
	q = require('q'),
	path = require('path'),
	runSequence = require('run-sequence'),
	moment = require('moment'),
	fs = require('fs'),
	gulp = require('gulp'),
	plugins = require('gulp-load-plugins')(),
	argv = require('yargs').argv,
	msf = require('microservice-framework');

/**
 * Print the error to console and exit(-1)
 * @param  {Error} err
 */
var handleError = function handleError(err) {
	console.error(err.toString());
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
			msf.config.files.tests.server,
			msf.config.files.tests.e2e
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
				mongoose.disconnect().then(done);
			});
	}).catch(handleError);
});

// Run the route tests
gulp.task('test-routes', ['env:test'], function() {
	var testRoutes = msf.gulp.testRoutes;
	var sources = argv.f ? [ 'app/*/server/routes/*' + argv.f ] : msf.config.files.tests.routes;
	var expect = require('gulp-expect-file');

	return gulp.src(sources)
		.pipe(expect(sources))
		.pipe(testRoutes(argv.silent));
});


/*
 * These are the main targets of the build
 */
gulp.task('test', function(done) {
	if (argv.h || argv.help) {
		console.log('---------------------------------------');
		console.log('Usage: gulp test [options]\n\n\tOptions:\n');
		console.log('\t-h, --help\t output usage information');
		console.log('\t-m\t\t run mocha tests*');
		console.log('\t-r\t\t run routing tests*');
		console.log('\t-d\t\t run jsDoc*');
		console.log('\t-f filename\t run tests for files that match this pattern only');
		console.log('\t--bail\t\t fail on first error (mocha only)');
		console.log('\t--nomocks\t\t run with actual services where applicable. This should be run before each deployment.');
		console.log('\n* if no test suites are specified, all tests will be run.');
		console.log('---------------------------------------');
		return;
	}

	var sequence = ['env:test'];

	var specifiedTestSuites = argv.m || argv.r ||argv.k || argv.p;
	if (!specifiedTestSuites) { sequence.push('lint'); }
	if (!specifiedTestSuites || argv.d) { sequence.push('jsdoc'); }
	if (!specifiedTestSuites || argv.m) { sequence.push('mocha'); }
	if (!specifiedTestSuites || argv.r) { sequence.push('test-routes'); }

	sequence.push(done);
	runSequence.apply(this, sequence);
});

/*
 * Debug tasks
 */

// Nodemon task
gulp.task('nodemon', function () {
	plugins.nodemon({
		script: 'server.js',
		nodeArgs: ['--inspect', '--debug=' + msf.config.devPorts.debug],
		ext: 'js,html',
		watch: _.union(msf.config.files.server.allJS, msf.config.files.server.config)
	});
});

// Maildev
gulp.task('maildev', function() {
	var maildev = require('maildev')();
	maildev.listen();
	maildev.on('new', plugins.util.log);
});


// Watch Files For Changes
gulp.task('watch', function() {
	// Add watch rules
	gulp.watch(msf.config.files.server.allJS, ['lint']);
});

// Run the project in debug mode (you still need to manually set NODE_ENV)
gulp.task('debug', function(done) {
	runSequence('lint', ['nodemon', 'watch', 'nodeInspector', 'maildev'], done);
});

// Run the project in development mode
gulp.task('default', ['debug']);

// Run the project in production mode
gulp.task('run', plugins.shell.task(['node ./server.js']));