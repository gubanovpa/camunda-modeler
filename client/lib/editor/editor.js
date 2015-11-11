'use strict';

var files = require('../util/files'),
    EditorActions = require('./editorActions'),
    menuUpdater = require('./menuUpdater'),
    workspace = require('../util/workspace'),
    onDrop = require('../util/onDrop'),
    DiagramControl = require('./diagram/control');

var assign = require('lodash/object/assign'),
    forEach = require('lodash/collection/forEach');


function isInput(target) {
  return target.type === 'textarea' || target.type === 'input';
}

function modifierPressed(evt) {
  return evt.ctrlKey || evt.metaKey;
}

function Editor($scope, $timeout) {

  var self = this,
      dirty = true;

  this.idx = 0;
  this.currentDiagram = null;
  this.diagrams = [];
  this.activeView = 'diagram';

  // Start listening to Browser communication
  this.editorActions = new EditorActions(this);

  this.canUndo = function() {
    return this.currentDiagram && !!this.currentDiagram.control.canUndo;
  };

  this.canRedo = function() {
    return this.currentDiagram && !!this.currentDiagram.control.canRedo;
  };

  this.isUnsaved = function() {
    return this.currentDiagram && !!this.currentDiagram.unsaved;
  };

  this.isOpen = function() {
    return this.currentDiagram;
  };

  this.trigger = function(action, opts) {
    if (this.currentDiagram) {
      this.currentDiagram.control.modelerActions.trigger(action, opts);
    }
  };

  this.history = function(action) {
    if (this.currentDiagram) {
      this.currentDiagram.control.traverseHistory(action);
    }
  };

  // Caveat to get the `Modifier+A` to work with **Select Elements**
  // If we don't do this, then the html elements will be highlighted
  // and the desired behaviour won't work
  window.addEventListener('keydown', function(evt) {
    if (evt.keyCode === 65 && modifierPressed(evt) && !isInput(evt.target)) {
      evt.preventDefault();

      if (self.currentDiagram) {
        self.currentDiagram.control.modelerActions.trigger('selectElements');
      }
    }
  });

  this.saveDiagram = function(diagram, options, done) {
    var self = this;

    if (typeof options === 'function') {
      done = options;
      options = {};
    }

    function handleSaving(err, diagram) {
      if (!err) {
        diagram.control.resetEditState();

        diagram.control.importXML(diagram.contents);
      }

      self.persist();

      $scope.$applyAsync();

      return done(err);
    }

    diagram.control.save(function(err, xml) {
      if (err) {
        return done(err);
      } else {
        diagram.contents = xml;

        files.saveFile(diagram, options, handleSaving);
      }
    });
  };

  this.save = function(create) {
    var active = this.currentDiagram;

    if (active) {
      this.saveDiagram(active, { create: create || false }, function(err) {
        console.log(err);
      });
    }
  };

  this.newDiagram = function(notation) {

    var diagram = {
      name: 'diagram_' + (this.idx++) + '.' + notation,
      path: '[unsaved]',
      notation: notation
    };

    this.showDiagram(diagram);

    $scope.$applyAsync();
  };

  this.isActive = function(diagram) {
    return this.currentDiagram === diagram;
  };

  /**
   * Open diagram file via the editor and show it
   */
  this.openDiagram = function() {

    var self = this;

    files.openFile(function(err, file) {
      if (err) {
        return console.error(err);
      }

      self.addDiagram(file);
    });
  };

  this.addDiagram = function(file) {
    if (file) {
      this.diagrams.push(file);
      this.showDiagram(file);

      $scope.$applyAsync();
    }
  };

  /**
   * Show diagram (or null)
   *
   * @param  {DiagramFile} [diagram]
   */
  this.showDiagram = function(diagram) {
    var menuEntriesUpdate = {},
        diagrams,
        notation;

    if (!this.isActive(diagram)) {
      this.currentDiagram = diagram;

      this.persist();
    }

    diagrams = this.diagrams;

    if (diagram) {
      notation = diagram.notation;

      if (diagrams.indexOf(diagram) === -1) {
        diagrams.push(diagram);
      }

      if (!diagram.control) {
        diagram.control = new DiagramControl(diagram);
      }

      if (dirty && diagrams.length >= 1) {
        menuUpdater.enableMenus();
        dirty = false;
      }

      menuEntriesUpdate = {
        history: [ self.canUndo(), self.canRedo() ],
        saving: self.isUnsaved()
      };

      if (diagram.notation === 'bpmn') {
        menuEntriesUpdate.selection = diagram.control.hasSelection();
      }

      menuUpdater.update(notation, menuEntriesUpdate);
    }

    // Disable modeling actions when there is no open diagram
    if (!diagrams.length) {
      menuUpdater.disableMenus();
      dirty = false;
    }
  };

  this._closeDiagram = function(diagram) {
    var diagrams = this.diagrams,
        idx = diagrams.indexOf(diagram);

    diagrams.splice(idx, 1);

    if (diagram.control) {
      diagram.control.destroy();
    }

    if (this.isActive(diagram)) {
      this.showDiagram(diagrams[idx] || diagrams[idx - 1]);
    } else {
      this.persist();
    }

    $scope.$applyAsync();
  };

  /**
   * Close the selected diagram, asking the user for
   * the unsaved action, if any.
   *
   * @param  {DiagramFile} diagram
   */
  this.closeDiagram = function(diagram) {

    var self = this;

    if (diagram.unsaved) {
      files.closeFile(diagram, function(err, diagramFile) {
        if (err) {
          return console.error(err);
        }

        self._closeDiagram(diagram);
      });
    } else {
      self._closeDiagram(diagram);
    }

    $scope.$applyAsync();
  };

  this.persist = function() {
    workspace.save(this, function() {
      console.debug('[editor]', 'persist workspace');
    });
  };

  this.saveBeforeQuit = function() {
    var self = this,
        idx,
        diagram;

    if (this.unsavedDiagrams.length === 0) {
      this.diagrams = this.savedDiagrams;

      self.persist();

      return files.quit(false);
    }

    diagram = this.unsavedDiagrams[0];

    idx = this.diagrams.indexOf(diagram);

    this.currentDiagram = diagram;

    console.debug('[editor]', 'currentDiagram', diagram);

    $scope.$applyAsync();

    files.saveFile(diagram, { create: true }, function(err, savedDiagram) {
      self.unsavedDiagrams.shift();

      if (idx !== -1) {
        self.diagrams.splice(idx, 1);
      }

      if (!err) {
        self.savedDiagrams.push(savedDiagram);
      }

      self.saveBeforeQuit();
    });
  };

  this.quit = function() {
    var self = this,
        hasUnsavedChanges;

    this.unsavedDiagrams = [];
    this.savedDiagrams = [];

    forEach(this.diagrams, function(diagram) {
      if (diagram.path === '[unsaved]' || diagram.unsaved) {
        self.unsavedDiagrams.push(diagram);
      } else{
        self.savedDiagrams.push(diagram);
      }
    });

    forEach(self.savedDiagrams, function(diagram) {
      var idx = self.diagrams.indexOf(diagram);

      if (idx !== -1) {
        self.diagrams.splice(idx, 1);
      }
    });

    hasUnsavedChanges = !!this.unsavedDiagrams.length;

    files.quit(hasUnsavedChanges, function(err, answer) {
      if (err) {
        return console.error(err);
      }

      if (answer !== 'save') {
        return;
      }

      console.debug('[editor]', 'quit');

      self.saveBeforeQuit();
    });
  };

  this.init = function() {

    var self = this;

    onDrop('body', function(e) {
      files.addFile(e.files[0].path, function() {
        // do nothing
      });
    });

    workspace.restore(function(err, config) {
      console.debug('[editor]', 'restoring workspace', config);

      if (err) {
        return console.error(err);
      }

      assign(self, config);

      if (config.currentDiagram) {
        console.debug('[editor]', 'open diagram', config.currentDiagram);

        self.showDiagram(config.currentDiagram);
      } else {
        $timeout(function() {
          menuUpdater.disableMenus();
        }, 100);
      }

      $scope.$applyAsync();
    });

  };

  this.init();
}

Editor.$inject = [ '$scope', '$timeout' ];

module.exports = Editor;
