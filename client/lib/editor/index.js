var angular = require('angular');

var ngModule = module.exports = angular.module('app.editor', [
  require('./diagram').name,
  require('./xml-editor').name
]);

ngModule.controller('EditorController', require('./editor'));
