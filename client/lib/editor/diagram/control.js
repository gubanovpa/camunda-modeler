'use strict';

var domify = require('min-dom/lib/domify');

var is = require('bpmn-js/lib/util/ModelUtil').is;

var createModeler = require('./modeler');

var menuUpdater = require('../menuUpdater'),
    files = require('../../util/files');

var XmlEditor = require('../xml-editor/editor');

var remote = require_electron('remote'),
    dialog = remote.require('dialog');


function isNotation(diagram, notation) {
  return diagram.notation && diagram.notation === notation;
}


function DiagramControl(diagramFile) {
  var self = this;

  var $el = domify('<div>'),
      $propertiesPanel = domify('<div id="js-properties-panel">');


  console.debug('[control]', diagramFile);

  var modeler = createModeler(diagramFile.notation, $el, $propertiesPanel);

  var commandStackIdx = -1,
      attachedScope;

  this.xmlEditor = new XmlEditor(this);
  this.activeView = 'diagram';

  function apply() {
    if (attachedScope) {
      attachedScope.$applyAsync();
    }
  }

  function imported(err, warnings) {
    var canvas,
        propPanel;

    if (err) {
      return self.handleImportError(err.message);
    }

    if (isNotation(diagramFile, 'bpmn')) {
      canvas = modeler.get('canvas');

      if (self.viewbox) {
        canvas.viewbox(self.viewbox);
      }

      self.updateDirtyState('diagram', false, false, false);

      self.modelerActions = modeler.get('editorActions');
    }

    // Hide the properties panel on diagram creation
    propPanel = $propertiesPanel.children[1];

    if (propPanel && propPanel.classList.contains('djs-properties-panel')) {
      propPanel.classList.add('hidden');
    }
  }

  modeler.on('selection.changed', function(evt) {
    var elements,
        hasSelection,
        enabled;

    if (!isNotation(diagramFile, 'bpmn')) {
      return;
    }

    elements = modeler.get('selection').get();
    hasSelection = !!elements.length;
    enabled = false;

    if ((elements.length === 1 &&
       !(is(elements[0], 'bpmn:Process') || is(elements[0], 'bpmn:Collaboration'))) ||
       elements.length > 1) {
      enabled = true;
    }

    menuUpdater.update(diagramFile.type, {
      selection: hasSelection
    });
  });

  modeler.on('commandStack.changed', function(e) {
    var commandStack = modeler.get('commandStack'),
        unsaved;

    unsaved = (commandStackIdx !== commandStack._stackIdx);

    self.updateDirtyState('diagram', commandStack.canUndo(), commandStack.canRedo(), unsaved);

    menuUpdater.update(diagramFile.type, {
      history: [ self.canUndo, self.canRedo ],
      saving: diagramFile.unsaved
    });
  });

  modeler.on('commandStack.changed', apply);

  this.updateDirtyState = function(view, canUndo, canRedo, dirty) {
    if (!this.isActiveView(view)) {
      return;
    }

    if (this.isActiveView('xml') && diagramFile.unsaved) {
      dirty = true;
    }

    this.canUndo = canUndo;
    this.canRedo = canRedo;

    diagramFile.unsaved = dirty;

    apply();
  };

  this.getDirtyState = function() {
    var commandStack = modeler.get('commandStack'),
        unsaved;

    unsaved = (commandStackIdx !== commandStack._stackIdx);

    return {
      undo: commandStack.canUndo(),
      redo: commandStack.canRedo(),
      unsaved: unsaved
    };
  };

  this.saveViewbox = function (event) {
    event.preventDefault();

    self.viewbox = event.viewbox;
  };

  modeler.on('canvas.viewbox.changed', this.saveViewbox);

  this.resetEditState = function() {
    var commandStack = modeler.get('commandStack');

    commandStackIdx = commandStack._stackIdx;

    diagramFile.unsaved = false;
  };

  this.redrawDiagram = function() {
    var xml = this.xmlEditor.getXml(),
        dirtyState;

    if (xml !== diagramFile.contents) {
      this.promptImportXml(function(answer) {
        if (answer === 'cancel') {
          return;
        }

        self.changeView('diagram');

        if (answer === 'yes') {
          modeler.importXML(xml, imported);

          self.updateDirtyState('diagram', false, false, true);
        }

        if (answer === 'no') {
          dirtyState = self.getDirtyState();

          self.updateDirtyState('diagram', dirtyState.undo, dirtyState.redo, dirtyState.unsaved);
        }

        apply();
      });
    } else {
      dirtyState = self.getDirtyState();

      this.changeView('diagram');

      self.updateDirtyState('diagram', dirtyState.undo, dirtyState.redo, dirtyState.unsaved);
    }
  };

  this.promptImportXml = function(callback) {
    dialog.showMessageBox({
        type: 'question',
        title: 'Reimport Diagram',
        buttons: [ 'Yes', 'No', 'Cancel' ],
        message: [
          'You\'ve made changes to the XML.',
          'If you apply these changes, all your editing history will be lost.',
          'Are you sure you want to persist them ?'
        ].join('\n')
      }, function(answer) {

        switch(answer) {
          case 0:
            callback('yes');
            break;
          case 1:
            callback('no');
            break;
          default:
            callback('cancel');
        }
      });
  };

  this.save = function(done) {
    modeler.saveXML({ format: true }, function(err, xml) {
      if (self.isActiveView('xml')) {
        xml = self.xmlEditor.getXml();
      }

      if (typeof done === 'function') {
        done(err, xml);
      }

      self.xml = diagramFile.contents = xml;

      apply();
    });
  };

  modeler.on('import.success', this.save);

  modeler.on('commandStack.changed', this.save);

  this.attach = function(scope, element) {
    attachedScope = scope;

    element.appendChild($el);
    element.appendChild($propertiesPanel);

    if (!modeler.diagram) {
      if (diagramFile.contents) {
        modeler.importXML(diagramFile.contents, imported);
      } else {
        modeler.createTemplate(imported);
      }
    }
  };

  this.detach = function() {
    var parent = $el.parentNode;

    if (parent) {
      attachedScope = null;
      parent.removeChild($el);
      parent.removeChild($propertiesPanel);
    }
  };

  this.destroy = function() {
    modeler.destroy();
  };

  this.hasSelection = function() {
    try {
      var selection = modeler.get('selection');
      return !!selection.get().length;
    } catch (e) {
      return false;
    }
  };

  this.importXML = function(xml) {
    modeler.importXML(diagramFile.contents, imported);
  };

  this.handleImportError = function(message) {
    files.importError(message, function(err) {
      console.error('[import error]', err);
    });
  };

  this.toggleView = function(viewName) {
    if (this.isActiveView(viewName)) {
      return;
    }

    if (viewName === 'diagram') {
      this.redrawDiagram();
    } else {
      this.changeView('xml');
      this.xmlEditor.update(diagramFile.contents);
    }
  };

  this.isActiveView = function(name) {
    return this.activeView === name;
  };

  this.changeView = function(viewName) {
    this.activeView = viewName;

    apply();
  };

  this.traverseHistory = function(action) {
    if (this.isActiveView('diagram')) {
      this.modelerActions.trigger(action);
    } else {
      this.xmlEditor[action]();
    }
  };
}


module.exports = DiagramControl;
