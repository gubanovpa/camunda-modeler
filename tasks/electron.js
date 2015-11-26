'use strict';

var forEach = require('lodash/collection/forEach'),
    assign = require('lodash/object/assign'),
    which = require('which');

var electronPackager = require('electron-packager');

var PACKAGE_JSON = require('../package.json');


/**
 * Grunt task as a wrapper around electron-packager, which specifices the
 * build platform(s) and excludes (ignores) files and folders.
 */
module.exports = function(grunt) {

	grunt.registerMultiTask('electron', 'Package Electron apps', function() {

    var done = this.async();

    var options = this.options();

    assign(options, {
      platform: options.platform,
      ignore: buildDistroIgnore()
    });

    // make sure wine is available on linux systems
    // if we are building the windows distribution
    if (process.platform !== 'win32' && options.platform === 'win32') {
      try {
        which.sync('wine');
      } catch(e) {
        return function(done) {
          console.log('Skipping Windows packaging: wine is not found');
          done(null);
        };
      }
    }

		electronPackager(options, function (err) {
			if (err) {
				grunt.warn(err);
				return;
			}

			done();
		});
	});
};


/**
 * Defines files and folders which should be ignored and not included in
 * the modeler distribution. Node modules which are defined in the devDependencies
 * section in package.json are also added to the ignore list.
 *
 * @return {RegExp} regular expression containing file and folder names
 *
 */
function buildDistroIgnore() {

  var ignore = [
    'app/develop',
    'distro',
    'client',
    'resources',
    'test',
    '.editorconfig',
    '.gitignore',
    '.jshintrc',
    'gulpfile.js',
    'README.md'
  ];


  forEach(PACKAGE_JSON.devDependencies, function(version, name) {
    ignore.push('node_modules/' + name);
  });

  return new RegExp('(' + ignore.join('|') + ')');
}

