'use strict';

var path = require('path');

/**
 * This behavior makes sure we set and update the
 * default path for file open and save dialogs.
 *
 * @param {ElectronApp} app
 * @param {Config} config
 */
function DefaultPathBehavior(app, config) {

  function setDefaultPath(options) {
    var defaultPath = config.get('defaultPath', app.getPath('userDesktop') || '.');
    options.defaultPath = defaultPath;
  }

  function updateDefaultPath(defaultPath) {
    config.set('defaultPath', defaultPath);
  }

  app.on('editor:dialog-opening', function(type, options) {
    if (isFileDialog(type)) {
      setDefaultPath(options);
    }
  });


  app.on('editor:dialog-closed', function(type, options, answer) {

    if (isFileOpenDialog(type) && answer) {
      // answer is a list of file names
      updateDefaultPath(path.dirname(answer[0]));
    }
  });
}


module.exports = DefaultPathBehavior;


////////////// utilities ////////////////////////////////

function isFileDialog(type) {
  return [ 'open', 'save' ].indexOf(type) !== -1;
}

function isFileOpenDialog(type) {
  return type === 'open';
}
