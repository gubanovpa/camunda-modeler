'use strict';

var workspace = require_app('workspace'),
    events = require_app('events');

/**
 * This module takes care of managing and persisting the visibility state
 * of the properties panel and its groups.
 *
 * @param {Editor} editor
 */
function PropertiesPanel() {

  this.open = true;

  this.groups = {
    general: { open: true },
    details: { open: true },
    multiInstance: { open: false },
    asyncGroup: { open: false },
    listener: { open: false },
    documentation: { open: true }
  };
}

PropertiesPanel.prototype.isOpen = function() {
  return this.open;
};

PropertiesPanel.prototype.isGroupOpen = function(groupId) {
  return this.open ? this.groups[groupId].open : false;
};

PropertiesPanel.prototype.hasProperties = function(diagram) {
  return diagram.notation === 'bpmn';
};

PropertiesPanel.prototype.toggleGroup = function (groupId) {
  this.groups[groupId].open = !this.groups[groupId].open;
  workspace.persist();
};

PropertiesPanel.prototype.toggle = function() {
  this.open = !this.open;
  workspace.persist();
};

module.exports = PropertiesPanel;