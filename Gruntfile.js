'use strict';

var PACKAGE_JSON = require('./package.json');

module.exports = function(grunt) {

  require('time-grunt')(grunt);

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    config: {
      sources: ['app', 'client'],
      tests: 'test/**/*.js'
    },

    release: {
      options: {
        tagName: 'v<%= version %>',
        commitMessage: 'chore(project): release v<%= version %>',
        tagMessage: 'chore(project): tag v<%= version %>',
        npm: false
      }
    },

    jshint: {
      src: ['<%= config.sources %>'],
      options: {
        jshintrc: true
      }
    },

    mochaTest: {
      files: ['<%= config.tests %>']
    },

    electron: {
      options: {
        name: PACKAGE_JSON.name,
        version: '0.34.3',
        'app-version': PACKAGE_JSON.version,
        dir: '.',
        out: 'distro',
        overwrite: true,
        asar: true,
        arch: 'all',
        icon: '../resources/icons/icon_128'
      },
      linux: {
        options: {
          platform: 'linux'
        }
      },
      darwin: {
        options: {
          name: 'Camunda Modeler',
          platform: 'darwin'
        }
      },
      win32: {
        options: {
          platform: 'win32',
          'version-string': {
            CompanyName: 'camunda Services GmbH',
            LegalCopyright: 'camunda Services GmbH, 2015',
            FileDescription: 'Camunda Modeler',
            OriginalFilename: 'camunda-modeler.exe',
            ProductVersion: PACKAGE_JSON.version,
            ProductName: 'Camunda Modeler',
            InternalName: 'camunda-modeler'
          }
        }
      }
    },

    /*
    copy: {
      linux: {
        options: {}
      }
    },
     */


    compress: {
      linux: {
        options: {
          paths: [],
        }
      },
      win32: {
        options: {
          paths: []
        },
      },
      darwin: {
        options: {
          paths: []
        }
      }
    }
  });

  // tasks

  grunt.loadTasks('tasks');

	grunt.registerTask('distro', function(platform) {

    if (!platform) {
      return grunt.task.run([ 'electron', 'compress' ]);
    } else {
      return grunt.task.run([ 'electron:' + platform, 'compress:' + platform ]);
    }
  });

  grunt.registerTask('test', [ 'mochaTest' ]);

  grunt.registerTask('default', [ 'jshint', 'test' ]);
};
