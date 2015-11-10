'use strict';

module.exports = function($timeout) {
  return {
    restrict: 'A',
    scope: {
      control: '='
    },
    require: '?ngModel',
    link: function(scope, element, attrs, model) {
      var xmlEditor = scope.control.xmlEditor;

      if (!xmlEditor) {
        throw new Error('no xml editor');
      }

      xmlEditor.attach(scope, element[0]);

      scope.$watch('control.xml', function(xml) {
        if (xml) {
          xmlEditor.set(xml);
        }
      });

      scope.$on('editor.view.toggle', function() {
        $timeout(function() {
          xmlEditor.refresh();
        }, 0);
      });

      scope.$on('$destroy', function() {
        xmlEditor.detach();
      });
    }
  };
};
