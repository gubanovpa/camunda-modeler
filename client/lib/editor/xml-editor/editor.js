'use strict';

var CodeMirror = require('codemirror');

  // xml syntax highlighting
  require('codemirror/mode/xml/xml');

  // auto close tags
  require('codemirror/addon/fold/xml-fold');
  require('codemirror/addon/edit/closetag');


function XmlEditor(diagramControl) {
  var attachedScope,
      codemirror,
      $el;

  function apply() {
    if (attachedScope) {
      attachedScope.$applyAsync();
    }
  }

  this.attach = function(scope, element) {
    attachedScope = scope;

    $el = document.createElement('textarea');

    element.appendChild($el);

    codemirror = this.createEditor();

    codemirror.addKeyMap({
      undo: CodeMirror.Pass,
      redo: CodeMirror.Pass
    });

    codemirror.on('changes', this.applyChanges.bind(this));

    if (this.history) {
      this.setXml(this.xml);

      codemirror.doc.clearHistory();

      codemirror.doc.setHistory(this.history);

      this.refresh();
    }
  };

  this.detach = function() {
    var parent = $el.parentNode;

    if (parent) {
      attachedScope = null;
      parent.removeChild($el);
   }
  };

  this.createEditor = function() {
    return CodeMirror.fromTextArea($el, {
      lineNumbers: true,
      mode: {
        name: 'application/xml',
        htmlMode: false
      },
      tabSize: 2,
      autoCloseTags: true
    });
  };

  this.refresh = function() {
    setTimeout(function() {
      codemirror.refresh();

      attachedScope.$apply();
    }, 0);
  };

  this.getXml = function() {
    return codemirror.getValue();
  };

  this.setXml = function(val) {
    if (val && val !== codemirror.getValue()) {
      codemirror.setValue(val);
    }
  };

  this.undo = function() {
    codemirror.doc.undo();

    this.updateDirtyState();
  };

  this.redo = function() {
    codemirror.doc.redo();

    this.updateDirtyStatoe();
  };

  this.applyChanges = function() {
    var xml = codemirror.getValue();

    if (!(this.xml && xml) || this.xml === xml) {
      return;
    }
    console.log('changes');

    this.xml = xml;

    this.updateDirtyState();
  };

  this.update = function(xml) {
    this.setXml(xml);

    this.updateDirtyState();

    this.refresh();
  };

  this.updateDirtyState = function() {
    var history,
        undo,
        redo,
        unsaved;

    if (!this.history) {
      codemirror.doc.clearHistory();
    }

    this.history = codemirror.doc.getHistory();

    history = codemirror.doc.historySize();

    undo = !!history.undo;
    redo = !!history.redo;
    unsaved = true;

    if ((!undo && redo) || (!undo && !redo)) {
      unsaved = false;
    }
    console.debug(history);
    diagramControl.updateDirtyState('xml', undo, redo, unsaved);
  };
}

module.exports = XmlEditor;
