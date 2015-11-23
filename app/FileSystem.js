'use strict';

var fs = require('fs'),
    path = require('path');

var ipc = require('ipc'),
    app = require('app'),
    Dialogs = require('./Dialogs');

var errorUtil = require('./util/error'),
    parseUtil = require('./util/parse');

var FILE_ENCODING = { encoding: 'utf8' };


/**
 * General structure for the diagram's file as an object.
 *
 * @param  {String} filePath
 * @param  {String} contents
 */
function createDiagramFile(filePath, contents) {

  var diagramType = parseUtil.guessFileType(contents);

  return {
    contents: contents,
    name: path.basename(filePath),
    notation: diagramType,
    path: filePath
  };
}

/**
 * Ensure the filePath has an extension valid to
 * hold the specified diagram file.
 *
 * @param {DiagramFile} diagramFile
 * @param {String} filePath
 * @return {String}
 */
function ensureExtension(filePath, diagramFile) {

  var extension;

  if (filePath) {
    extension = path.extname(filePath);

    if (!extension) {
      filePath = filePath + '.' + diagramFile.notation;
    }
  }

  return filePath;
}

/**
 * Write diagramFile under specified file path and
 * return updated file.
 *
 * @param {String} filePath
 * @param {DiagramFile} diagramFile
 *
 * @return {DiagramFile} updated diagram file
 */
function writeDiagram(filePath, diagramFile) {

  // write file
  fs.writeFileSync(filePath, diagramFile.contents, FILE_ENCODING);

  diagramFile.name = path.basename(filePath);
  diagramFile.path = filePath;

  return diagramFile;
}


/**
 * Read a diagram from the given file path.
 *
 * @param {String} filePath
 *
 * @return {DiagramFile}
 */
function readDiagram(filePath) {
  var contents = fs.readFileSync(filePath, FILE_ENCODING);

  return createDiagramFile(filePath, contents);
}

/**
 * Interface for handling files
 *
 * @param {Config} config
 */
function FileSystem(browserWindow, config) {

  var dialogs = Dialogs.get(browserWindow);


  ipc.on('file-save', function(event, diagramFile, saveAs) {

    var filePath,
        updatedDiagram,
        error;

    if (saveAs) {
      filePath = dialogs.askSaveAs(diagramFile);

      if (filePath) {
        filePath = ensureExtension(filePath, diagramFile);
      }
    } else {
      filePath = diagramFile.path;
    }

    try {
      if (filePath) {
        updatedDiagram = writeDiagram(filePath, diagramFile);

        app.emit('editor:file-save', updatedDiagram);
      }
    } catch (err) {
      error = err;
    }

    event.sender.send('file-save:response', error, updatedDiagram);
  });


  ipc.on('file-ask-open', function(event) {
    var files = dialogs.askOpen();

    event.sender.send('file-ask-open:response', null, files);
  });


  ipc.on('file-open', function(event, filePath) {

    var newDiagram,
        error;

    try {
      newDiagram = readDiagram(filePath);

      if (!newDiagram.notation) {
        dialogs.showUnrecognizedFileDialog(newDiagram.name);
        newDiagram = null;
      }

      app.emit('editor:file-open', newDiagram);
    } catch (err) {
      error = err;
    }

    event.sender.send('file-open:response', error, newDiagram);
  });


  ipc.on('file-close', function(event, diagramFile) {
    app.emit('editor:file-close', diagramFile);

    event.sender.send('file-close:response');
  });


  ipc.on('file:import-error', function(event, trace) {

    var choice = dialogs.showImportErrorDialog(trace);

    if (choice === 'forum') {
      open('https://forum.bpmn.io');
    }

    event.sender.send('file:import-error', null, choice);
  });


  ipc.on('editor.quit', function(event, hasUnsavedChanges) {
    event.sender.send('editor.quit.response', null);

    app.emit('editor:quit-allowed');
  });
}

    var diagramFile = createDiagramFile(filePath, file);

    if (!diagramFile.notation) {
      return self.showUnrecognizedFileDialog(diagramFile.name, function(err) {
        if (err) {
          return callback(err);
        }

        self.open(callback);
      });
    }

    if (parseUtil.hasActivitiURL(diagramFile.contents)) {

      self.showNamespaceDialog(function(answer) {
        if (answer === 0) {
          diagramFile.contents = parseUtil.replaceNamespace(diagramFile.contents);
        }

        callback(null, diagramFile);
      });
    } else {
      callback(null, diagramFile);
    }
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
    this.showSaveAsDialog(diagramFile, function(filename) {
      if (!filename) {
        return callback(new Error(errorUtil.CANCELLATION_MESSAGE));
      }

      filename = self.sanitizeFilename(filename, diagramFile.notation);

      self._save(filename, diagramFile, callback);
    });
  } else {
    this._save(diagramFile.path, diagramFile, callback);
  }
};

FileSystem.prototype._save = function(filePath, diagramFile, callback) {
  if (!callback) {
    return fs.writeFileSync(filePath, diagramFile.contents, FILE_ENCODING);
  }

  fs.writeFile(filePath, diagramFile.contents, FILE_ENCODING,  function(err) {
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
    if (result === 2) {
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


/**
 * Handle errors that the IPC has to deal with.
 *
 * @param  {String} event
 * @param  {Error} err
 */
FileSystem.prototype.handleError = function(event, err) {
  if (!errorUtil.isCancel(err)) {
    this.showGeneralErrorDialog(err);
  }
  this.browserWindow.webContents.send(event, errorUtil.normalizeError(err));
};


FileSystem.prototype.sanitizeFilename = function(filename, notation) {
  var extension = path.extname(filename);

  if (extension === '') {
    return filename + '.' + notation;
  }

  return filename;
};

module.exports = FileSystem;
