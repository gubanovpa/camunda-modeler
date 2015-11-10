var angular = require('angular');

var ngModule = module.exports = angular.module('app.editor.xmlEditor', []);

ngModule.directive('xmlEditor', require('./directive'));
