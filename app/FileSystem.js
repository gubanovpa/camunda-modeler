'use strict';

var fs = require('fs'),
    path = require('path');

var Ipc = require('ipc'),
    app = require('app'),
    Dialog = require('dialog'),
    open = require('open');

var errorUtil = require('./util/error'),
    parseUtil = require('./util/parse');

var SUPPORTED_EXT = [ 'bpmn', 'dmn', 'bpmn20.xml', 'dmn11.xml' ];

var SUPPORTED_EXT_FILTER = [
  { name: 'All supported', extensions: SUPPORTED_EXT },
  { name: 'BPMN diagram', extensions: [ 'bpmn', 'bpmn20.xml' ] },
  { name: 'DMN table', extensions: [ 'dmn', 'dmn11.xml' ] },
  { name: 'All files', extensions: [ '*' ] }
];

/**
 * General structure for the diagram's file as an object.
 *
 * @param  {String} filePath
 * @param  {String} file
 */
function createDiagramFile(filePath, file) {
  return {
    contents: file,
    name: path.basename(filePath),
    notation: parseUtil.notation(filePath),
    path: filePath
  };
}

/**
 * Interface for handling files.
 *
 * @param  {Object} browserWindow   Main browser window
 */
function FileSystem(browserWindow, config) {
  var self = this;

  this.browserWindow = browserWindow;
  this.config = config;
  this.encoding = { encoding: 'utf8' };


  Ipc.on('file.save', function(evt, newDirectory, diagramFile) {
    self.save(newDirectory, diagramFile, function(err, updatedDiagram) {
      if (err) {
        return self.handleError('file.save.response', err);
      }

      app.emit('editor-add-recent', updatedDiagram.path);

      browserWindow.webContents.send('file.save.response', null, updatedDiagram);
    });
  });

  Ipc.on('file.add', function(evt, path) {
    self.addFile(path);
  });

  Ipc.on('file.open', function(evt) {
    self.open(function(err, diagramFile) {
      if (err) {
        return self.handleError('file.open.response', err);
      }

      app.emit('editor-add-recent', diagramFile.path);

      browserWindow.webContents.send('file.open.response', null, diagramFile);
    });
  });


  Ipc.on('file.close', function(evt, diagramFile) {
    self.close(diagramFile, function(err, updatedDiagram) {
      if (err) {
        return self.handleError('file.close.response', err);
      }

      browserWindow.webContents.send('file.close.response', null, updatedDiagram);
    });
  });


  Ipc.on('editor.quit', function(evt, hasUnsavedChanges) {
    if (hasUnsavedChanges === false) {
      self.browserWindow.webContents.send('editor.quit.response', null);

      return app.emit('app-quit-allowed');
    }

    self.quit(function(err, answer) {
      if (err) {
        return self.handleError('editor.quit.response', err);
      }

      self.browserWindow.webContents.send('editor.quit.response', null, answer);

      if (answer === 'quit') {
        app.emit('app-quit-allowed');
      }
    });
  });


  Ipc.on('editor.import.error', function(evt, trace) {
    self.showImportError(trace);

    self.browserWindow.webContents.send('editor.actions', { event: 'control.showXML' });

    self.browserWindow.webContents.send('editor.import.error.response', trace);
  });
}

FileSystem.prototype.open = function(callback) {
  var self = this;

  this.showOpenDialog(function(filenames) {
    if (!filenames) {
      return callback(new Error(errorUtil.CANCELLATION_MESSAGE));
    }

    self._open(filenames[0], callback);
  });
};

FileSystem.prototype._open = function(filePath, callback) {
  var browserWindow = this.browserWindow,
      self = this;

  if (!this.isExtAllowed(filePath)) {
    Dialog.showErrorBox('Wrong file type', 'Please choose a .bpmn or .dmn file!');

    this.open(function(err, diagramFile) {
      if (err) {
        return self.handleError('file.open.response', err);
      }
      browserWindow.webContents.send('file.open.response', null, diagramFile);
    });
    return;
  }

  this._openFile(filePath, callback);
};

FileSystem.prototype._openFile = function(filePath, callback) {
  fs.readFile(filePath, this.encoding, function(err, file) {
    var diagramFile = createDiagramFile(filePath, file);

    callback(err, diagramFile);
  });
};

FileSystem.prototype.addFile = function(filePath) {
  var self = this,
      browserWindow = this.browserWindow;

  this._openFile(filePath, function(err, diagramFile) {
    if (err) {
      return self.showGeneralErrorDialog();
    }

    browserWindow.webContents.send('editor.actions', {
      event: 'file.add',
      data: {
        diagram: diagramFile
      }
    });
  });
};

FileSystem.prototype.save = function(newDirectory, diagramFile, callback) {
  var self = this;

  // Save as..
  if (newDirectory || diagramFile.path === '[unsaved]') {
    this.showSaveAsDialog(diagramFile.name, function(filename) {
      if (!filename) {
        return callback(new Error(errorUtil.CANCELLATION_MESSAGE));
      }

      filename = self.sanitizeFilename(filename);

      self._save(filename, diagramFile, callback);
    });
  } else {
    this._save(diagramFile.path, diagramFile, callback);
  }
};

FileSystem.prototype._save = function(filePath, diagramFile, callback) {
  if (!callback) {
    return fs.writeFileSync(filePath, diagramFile.contents, this.encoding);
  }

  fs.writeFile(filePath, diagramFile.contents, this.encoding,  function(err) {
    var diagram = {
      name: path.basename(filePath),
      path: filePath
    };

    callback(err, diagram);
  });
};

FileSystem.prototype.close = function(diagramFile, callback) {
  var self = this;

  this.showCloseDialog(diagramFile.name, function(result) {
    if (result === 0) {
      return callback(new Error(errorUtil.CANCELLATION_MESSAGE));
    }
    else if (result === 1) {
      return callback(null, diagramFile);
    }
    else {
      self.save(false, diagramFile, callback);
    }
  });
};

FileSystem.prototype.quit = function(callback) {

  this.showQuitDialog(function(promptResult) {
    switch (promptResult) {
      case 'save':
        callback(null, 'save');
        break;
      case 'quit':
        callback(null, 'quit');
        break;
      default:
        callback(new Error(errorUtil.CANCELLATION_MESSAGE));
    }
  });
};

// FileSystem.prototype.handleImportError = function(trace, callback) {
//
//   this.showImportError(trace, function(answer) {
//     switch (answer) {
//       case 1:
//         open('https://forum.bpmn.io/');
//         callback('forum');
//         break;
//       case 2:
//         open('https://github.com/bpmn-io/bpmn-js/issues');
//         callback('tracker');
//         break;
//       default:
//         callback('close');
//     }
//   });
// };

/**
 * Handle errors that the IPC has to deal with.
 *
 * @param  {String} event
 * @param  {Error} err
 */
FileSystem.prototype.handleError = function(event, err) {
  if (!errorUtil.isCancel(err)) {
    this.showGeneralErrorDialog();
  }
  this.browserWindow.webContents.send(event, errorUtil.normalizeError(err));
};

FileSystem.prototype.showOpenDialog = function(callback) {
  var config = this.config,
      defaultPath = config.get('defaultPath', app.getPath('userDesktop'));

  var opts = {
      title: 'Open diagram',
      defaultPath: defaultPath,
      properties: [ 'openFile' ],
      filters: SUPPORTED_EXT_FILTER
  };

  if (!callback) {
    return Dialog.showOpenDialog(this.browserWindow, opts);
  }

  Dialog.showOpenDialog(this.browserWindow, opts, function(filenames) {
    if (filenames) {
      config.set('defaultPath', path.dirname(filenames[0]));
    }

    callback(filenames);
  });
};

FileSystem.prototype.showSaveAsDialog = function(name, callback) {
  var config = this.config,
      defaultPath = config.get('defaultPath', app.getPath('userDesktop')),
      title;

  if (typeof name === 'function') {
    callback = name;
    name = 'diagram';
  }

  title = 'Save ' + name + ' as..';

  var opts = {
    title: title,
    filters: SUPPORTED_EXT_FILTER,
    defaultPath: defaultPath
  };

  if (!callback) {
    return Dialog.showSaveDialog(this.browserWindow, opts);
  }

  Dialog.showSaveDialog(this.browserWindow, opts, callback);
};

FileSystem.prototype.showCloseDialog = function(name, callback) {
  var opts = {
    title: 'Close diagram',
    message: 'Save changes to ' + name + ' before closing?',
    type: 'question',
    buttons: [ 'Cancel', 'Don\'t Save', 'Save' ]
  };

  if (!callback) {
    return Dialog.showMessageBox(this.browserWindow, opts);
  }

  Dialog.showMessageBox(this.browserWindow, opts, callback);
};

FileSystem.prototype.showQuitDialog = function(callback) {
  var opts = {
    title: 'Quit Modeler',
    message: 'You have some unsaved diagrams.' + '\n' + 'Do you want to save them before quitting ?',
    type: 'question',
    buttons: [ 'Yes', 'Quit', 'Cancel' ]
  };

  if (!callback) {
    return Dialog.showMessageBox(this.browserWindow, opts);
  }

  Dialog.showMessageBox(this.browserWindow, opts, function(result) {
    switch (result) {
      case 0:
        callback('save');
        break;
      case 1:
        callback('quit');
        break;
      default:
        callback('cancel');
    }
  });
};

FileSystem.prototype.showImportError = function(trace) {
  var message = [
    'Ooops, we could not display the diagram!',
    'You believe your input is valid BPMN 2.0 XML ?',
    'Consult our forum or file an issue in our issue tracker.',
    '',
    trace
  ].join('\n');
  console.log(message);
  Dialog.showErrorBox('Import Error', message);
};

FileSystem.prototype.showGeneralErrorDialog = function() {
  Dialog.showErrorBox('Error', 'There was an internal error.' + '\n' + 'Please try again.');
};

FileSystem.prototype.sanitizeFilename = function(filename) {
  var extension = path.extname(filename);

  if (extension === '') {
    return filename + '.bpmn';
  }

  return filename;
};

FileSystem.prototype.isExtAllowed = function isExtAllowed(filePath) {
  var extension = parseUtil.extname(filePath);

  return extension && SUPPORTED_EXT.indexOf(extension) !== -1;
};

module.exports = FileSystem;
