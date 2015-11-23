'use strict';

var BPMN_TYPE = { name: 'BPMN diagram', extensions: [ 'bpmn', 'xml' ] };
var DMN_TYPE = { name: 'DMN table', extensions: [ 'dmn', 'xml' ] };

var ALL_SUPPORTED_EXTENSIONS = [ 'bpmn', 'dmn', 'xml' ];

var ALL_TYPES = [
  { name: 'All supported', extensions: ALL_SUPPORTED_EXTENSIONS },
  BPMN_TYPE,
  DMN_TYPE,
  { name: 'All files', extensions: [ '*' ] }
];


module.exports.getOpenFilters = function() {
  return ALL_TYPES;
};

module.exports.getSaveAsFilters = function(diagramFile) {
  var notation = diagramFile.notation;

  if (notation === 'bpmn') {
    return [ BPMN_TYPE ];
  } else
  if (notation === 'dmn') {
    return [ DMN_TYPE ];
  } else {
    return null;
  }
};