'use strict';

var debounce = require('lodash/function/debounce');

var CodeMirror = require('codemirror');

  // xml syntax highlighting
  require('codemirror/mode/xml/xml');

  // auto close tags
  require('codemirror/addon/fold/xml-fold');
  require('codemirror/addon/edit/closetag');


function XmlEditor(diagramControl) {
  var attachedScope,
      $el,
      codemirror;

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

    codemirror.on('change', debounce(this.updateDiagram.bind(this), 250));

    apply();
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

  this.set = function(val) {
    if (val !== codemirror.getValue()) {
      codemirror.setValue(val);
    }

    apply();
  };

  this.refresh = function() {
    codemirror.refresh();
  };

  this.updateDiagram = function() {
    diagramControl.redrawDiagram(codemirror.getValue());
  };
}

module.exports = XmlEditor;
