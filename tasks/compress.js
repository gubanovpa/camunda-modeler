'use strict';

var archiver = require('archiver'),
    fs = require('fs');

var copyRecursive = require('ncp');

module.exports = function(grunt) {

	grunt.registerMultiTask('compress', 'Create a platform specific archive', function() {

    var done = this.async();

    var options = this.options(),
        platform = options.target,
        paths = options.paths;

    amendAndArchive(platform, paths, done);

  });
};


function createArchive(platform, path, done) {

  return function(err) {

    if (err) {
      return done(err);
    }

    var archive,
        dest = path,
        output;

    if (platform === 'win32') {
      archive = archiver('zip', {});
      dest += '.zip';
    } else {
      archive = archiver('tar', { gzip: true });
      dest += '.tar.gz';
    }

    output = fs.createWriteStream(dest);

    archive.pipe(output);
    archive.on('end', done);
    archive.on('error', done);

    archive.directory(path, 'camunda-modeler').finalize();
  };
}

function amendAndArchive(platform, paths, done) {

  var idx = 0;

  var platformAssets = __dirname + '/resources/' + platform;

  function processNext(err) {

    if (err) {
      return done(err);
    }

    var currentPath = paths[idx++];

    if (!currentPath) {
      return done(err, paths);
    }

    var archive = createArchive(platform, currentPath, processNext);

    if (fs.existsSync(platformAssets)) {
      copyRecursive(platformAssets, currentPath, archive);
    } else {
      archive();
    }
  }

  processNext();
}