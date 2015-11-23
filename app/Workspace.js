'use strict';

var fs = require('fs');

var ipc = require('ipc');

/**
 * Workspace restore and save functionality.
 *
 * @param {Config} config
 */
function Workspace(config) {

  ipc.on('workspace.restore', function(event) {

    var workspace = config.get('workspace', null);

    if (!workspace) {
      return event.sender.send('workspace.restore.response', new Error('Workspace is empty'));
    }

    workspace.diagrams = workspace.diagrams.filter(function(diagram) {
      var contents;

      try {
        contents = fs.readFileSync(diagram.path, { encoding: 'utf8' });

        // set diagram contents
        diagram.contents = contents;

        return true;
      } catch (e) {
        return false;
      }
    });

    event.sender.send('workspace.restore.response', null, workspace);
  });

  ipc.on('workspace.save', function(event, workspace) {

    config.set('workspace', workspace, function(err) {
      event.sender.send('workspace.save.response', err);
    });
  });

}

module.exports = Workspace;


function init(config) {
  return new Workspace(config);
}

module.exports.init = init;