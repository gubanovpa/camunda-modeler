'use strict';

var BEHAVIORS = [
  require('./DefaultPathBehavior')
];


module.exports.init = function(app, config) {

  BEHAVIORS.forEach(function(Behavior) {
    new Behavior(app, config);
  });
};