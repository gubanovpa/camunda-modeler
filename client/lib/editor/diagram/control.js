'use strict';

var domify = require('min-dom/lib/domify');

var is = require('bpmn-js/lib/util/ModelUtil').is;

var createModeler = require('./modeler');

var menuUpdater = require('../menuUpdater'),
    files = require('../../util/files');

var XmlEditor = require('../xml-editor/editor');


function isNotation(diagram, notation) {
  return diagram.notation && diagram.notation === notation;
}


function DiagramControl(diagramFile) {
  var self = this;

  var $el = domify('<div>'),
      $propertiesPanel = domify('<div id="js-properties-panel">');

  this.xmlEditor = new XmlEditor(this);

  console.debug('[control]', diagramFile);

  var modeler = createModeler(diagramFile.notation, $el, $propertiesPanel);

  var commandStackIdx = -1,
      attachedScope;

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
    var commandStack = modeler.get('commandStack');

    self.canUndo = commandStack.canUndo();
    self.canRedo = commandStack.canRedo();

    diagramFile.unsaved = (commandStackIdx !== commandStack._stackIdx);

    menuUpdater.update(diagramFile.type, {
      history: [ self.canUndo, self.canRedo ],
      saving: diagramFile.unsaved
    });
  });

  modeler.on('commandStack.changed', apply);

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

  this.redrawDiagram = function(xml) {
    if (xml !== diagramFile.contents) {
      modeler.importXML(xml, imported);

      diagramFile.unsaved = true;
    }
  };

  this.save = function(done) {
    modeler.saveXML({ format: true }, function(err, xml) {
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

  this.hasSelection = function() {
    try {
      var selection = modeler.get('selection');
      return !!selection.get().length;
    } catch (e) {
      return false;
    }
  };

  this.destroy = function() {
    modeler.destroy();
  };

  this.handleImportError = function(message) {
    files.importError(message, function(err) {
      console.error('[import error]', err);
    });
  };
}


module.exports = DiagramControl;
