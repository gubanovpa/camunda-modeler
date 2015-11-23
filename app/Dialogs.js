'use strict';

var dialog = require('dialog');

var app = require('app');

var FileTypes = require('./FileTypes');


var methods = {
  open: 'showOpenDialog',
  save: 'showSaveDialog',
  message: 'showMessageBox',
  error: 'showErrorBox'
};


function Dialogs() {

  /**
   * Show a dialog
   *
   * @param {String} type dialog type
   * @param {Object} options
   */
  this.showDialog = function(type, options) {

    app.emit('editor:dialog-opening', type, options);

    var buttons = options.buttons,
        realButtons;

    // disable aweful link button creation on Windows
    options.noLink = true;

    // extract button labels
    if (buttons) {

      // collect labels from { id: ..., label: ... } button descriptor
      realButtons = buttons.map(function(b) {
        if (typeof b !== 'string') {
          return b.label;
        } else {
          return b;
        }
      });

      options.buttons = realButtons;
    }

    var answer = dialog[methods[type]](options),
        clickedButton;

    if (buttons) {
      clickedButton = buttons[answer];

      // unwrap id from { id: ..., label: ... } button descriptor
      if (typeof clickedButton !== 'string') {
        answer = clickedButton.id;
      }
    }

    app.emit('editor:dialog-closed', type, options, answer);

    return answer;
  };
}

Dialogs.prototype.askOpen = function() {

  var options = {
    title: 'Open diagram',
    properties: [ 'openFile' ],
    filters: FileTypes.getOpenFilters()
  };

  return this.showDialog('open', options);
};

Dialogs.prototype.askSaveAs = function(diagramFile) {

  var options = {
    title: 'Save ' + diagramFile.name + ' as..',
    filters: FileTypes.getSaveAsFilters(diagramFile)
  };

  return this.showDialog('save', options);
};


Dialogs.prototype.showUnsavedWarningDialog = function(name) {
  var options = {
    title: 'Unsaved diagram',
    message: 'Save changes to ' + name + ' before closing?',
    type: 'question',
    buttons: [
      { id: 'save', label: 'Save' },
      { id: 'discart', label: 'Don\'t Save' },
      { id: 'cancel', label: 'Cancel' }
    ]
  };

  return this.showDialog('message', options);
};

Dialogs.prototype.showImportErrorDialog = function(trace) {
  var options = {
    type: 'error',
    title: 'Importing Error',
    buttons: [
      { id: 'close', label: 'Close' },
      { id: 'forum', label: 'Forum' },
      { id: 'issues', label: 'Issue Tracker' }
    ],
    message: 'Ooops, we could not display the diagram!',
    detail: [
      'You believe your input is valid BPMN 2.0 XML ?',
      'Consult our forum or file an issue in our issue tracker.',
      '',
      trace
    ].join('\n')
  };

  return this.showDialog('message', options);
};

Dialogs.prototype.showUnrecognizedFileDialog = function(name) {

  var options = {
    type: 'warning',
    title: 'Unrecognized file format',
    buttons: [ { id: 'close', label: 'Close' } ],
    message: 'The file "' + name + '" is not a BPMN or DMN file.'
  };

  return this.showDialog('message', options);
};

Dialogs.prototype.showNamespaceDialog = function() {
  var options = {
    type: 'warning',
    title: 'Deprecated <activiti> namespace detected',
    buttons: [ 'Yes', 'No' ],
    message: 'Would you like to convert your diagram to the <camunda> namespace?',
    detail: [
      'This will allow you to maintain execution related properties.',
      '',
      '<camunda> namespace support works from Camunda BPM version 7.4.0, 7.3.3, 7.2.6 onwards.'
    ].join('\n')
  };

  return this.showDialog('message', options);
};

Dialogs.prototype.showGeneralErrorDialog = function(err) {
  var message = 'Ooops, that should not have happened: \n\n' + err.message;

  return this.showDialog('error', message);
};

module.exports = Dialogs;


module.exports.get = function(browserWindow) {
  return new Dialogs(browserWindow);
};