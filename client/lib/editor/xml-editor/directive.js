'use strict';

module.exports = function($timeout) {
  return {
    restrict: 'A',
    scope: {
      control: '='
    },
    link: function(scope, element, attrs, model) {
      var xmlEditor = scope.control.xmlEditor;

      if (!xmlEditor) {
        throw new Error('no xml editor');
      }

      xmlEditor.attach(scope, element[0]);

      scope.$on('$destroy', function() {
        xmlEditor.detach();
      });
    }
  };
};
