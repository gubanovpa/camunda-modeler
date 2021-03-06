'use strict';

var app = require('app'),
    browserOpen = require('../util/browser-open');


var CANVAS_MOVE_SPEED = 20;

function getEditMenu(browserWindow, notation) {
  // BPMN modeling actions
  var bpmnActions = [
    {
      label: 'Space Tool',
      accelerator: 'S',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'bpmn.spaceTool' });
      }
    },
    {
      label: 'Lasso Tool',
      accelerator: 'L',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'bpmn.lassoTool' });
      }
    },
    {
      id: 'bpmn:directEditing',
      label: 'Direct Editing',
      accelerator: 'E',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'bpmn.directEditing' });
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Move Canvas',
      submenu: [
        {
          label: 'Move Up',
          accelerator: 'Up',
          click: function() {
            browserWindow.webContents.send('editor.actions', {
              event: 'bpmn.moveCanvas',
              data: {
                speed: CANVAS_MOVE_SPEED,
                direction: 'up'
              }
            });
          }
        },
        {
          label: 'Move Left',
          accelerator: 'Left',
          click: function() {
            browserWindow.webContents.send('editor.actions', {
              event: 'bpmn.moveCanvas',
              data: {
                speed: CANVAS_MOVE_SPEED,
                direction: 'left'
              }
            });
          }
        },
        {
          label: 'Move Down',
          accelerator: 'Down',
          click: function() {
            browserWindow.webContents.send('editor.actions', {
              event: 'bpmn.moveCanvas',
              data: {
                speed: CANVAS_MOVE_SPEED,
                direction: 'down'
              }
            });
          }
        },
        {
          label: 'Move Right',
          accelerator: 'Right',
          click: function() {
            browserWindow.webContents.send('editor.actions', {
              event: 'bpmn.moveCanvas',
              data: {
                speed: CANVAS_MOVE_SPEED,
                direction: 'right'
              }
            });
          }
        }
      ]
    },
    {
      label: 'Select All',
      accelerator: 'CommandOrControl+A',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'bpmn.selectElements' });
      }
    },
    {
      id: 'bpmn:removeSelected',
      label: 'Remove Selected',
      accelerator: 'Delete',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'bpmn.removeSelection' });
      }
    }
  ];

  // DMN modeling actions
  var dmnActions = [
    {
      id: 'dmn:addRules',
      label: 'Add Rule..',
      submenu: [
        {
          id: 'dmn:ruleAdd',
          label: 'At End',
          accelerator: 'CommandOrControl+D',
          click: function() {
            browserWindow.webContents.send('editor.actions', { event: 'dmn.ruleAdd' });
          }
        },
        {
          id: 'dmn:ruleAddAbove',
          label: 'Above Selected',
          click: function() {
            browserWindow.webContents.send('editor.actions', { event: 'dmn.ruleAddAbove' });
          }
        },
        {
          id: 'dmn:ruleAddBelow',
          label: 'Below Selected',
          click: function() {
            browserWindow.webContents.send('editor.actions', { event: 'dmn.ruleAddBelow' });
          }
        }
      ]
    },
    {
      id: 'dmn:ruleClear',
      label: 'Clear Rule',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'dmn.ruleClear' });
      }
    },
    {
      id: 'dmn:ruleRemove',
      label: 'Remove Rule',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'dmn.ruleRemove' });
      }
    },
    {
      type: 'separator'
    },
    {
      id: 'dmn:addClauses',
      label: 'Add Clause..',
      submenu: [
        {
          label: 'Input',
          click: function() {
            browserWindow.webContents.send('editor.actions', {
              event: 'dmn.clauseAdd',
              data: {
                type: 'input'
              }
            });
          }
        },
        {
          label: 'Output',
          click: function() {
            browserWindow.webContents.send('editor.actions', {
              event: 'dmn.clauseAdd',
              data: {
                type: 'output'
              }
            });
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'dmn:clauseAddLeft',
          label: 'Left of selected',
          click: function() {
            browserWindow.webContents.send('editor.actions', { event: 'dmn.clauseAddLeft' });
          }
        },
        {
          id: 'dmn:clauseAddRight',
          label: 'Right of selected',
          click: function() {
            browserWindow.webContents.send('editor.actions', { event: 'dmn.clauseAddRight' });
          }
        }
      ]
    },
    {
      id: 'dmn:clauseRemove',
      label: 'Remove Clause',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'dmn.clauseRemove' });
      }
    }
  ];


  // Base editing actions
  var baseSubmenu = [
    {
      id: 'undo',
      label: 'Undo',
      accelerator: 'CommandOrControl+Z',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'editor.undo' });
      }
    },
    {
      id: 'redo',
      label: 'Redo',
      accelerator: 'CommandOrControl+Y',
      click: function() {
        browserWindow.webContents.send('editor.actions', { event: 'editor.redo' });
      }
    },
    {
      type: 'separator'
    }
  ];

  var modelingActions = notation === 'dmn' ? dmnActions : bpmnActions;

  return {
    id: 'edit',
    label: 'Edit',
    notation: notation,
    submenu: baseSubmenu.concat(modelingActions)
  };
}

module.exports = function(browserWindow, notation) {
  var fileMenu = {
    id: 'file',
    label: 'File',
    submenu: [
      {
        id: 'newFile',
        label: 'New File',
        submenu: [
          {
            id: 'newBpmnFile',
            label: 'BPMN Diagram',
            accelerator: 'CommandOrControl+T',
            click: function() {
              browserWindow.webContents.send('editor.actions', {
                event: 'editor.new',
                diagramType: 'bpmn'
              });
            }
          },
          {
            id: 'newDmnFile',
            label: 'DMN Table',
            click: function() {
              browserWindow.webContents.send('editor.actions', {
                event: 'editor.new',
                diagramType: 'dmn'
              });
            }
          }
        ]
      },
      {
        id: 'openFile',
        label: 'Open File...',
        accelerator: 'CommandOrControl+O',
        click: function() {
          browserWindow.webContents.send('editor.actions', { event: 'file.open' });
        }
      },
      {
        type: 'separator'
      },
      {
        id: 'save',
        label: 'Save File',
        accelerator: 'CommandOrControl+S',
        click: function() {
          browserWindow.webContents.send('editor.actions', {
            event: 'file.save',
            data: {
              create: false
            }
          });
        }
      },
      {
        label: 'Save File As..',
        accelerator: 'CommandOrControl+Shift+S',
        click: function() {
          browserWindow.webContents.send('editor.actions', {
            event: 'file.save',
            data: {
              create: true
            }
          });
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Close Tab',
        accelerator: 'CommandOrControl+W',
        click: function() {
          browserWindow.webContents.send('editor.actions', { event: 'editor.close' });
        }
      },
      {
        id: 'quit',
        label: 'Quit',
        accelerator: 'CommandOrControl+Q',
        click: function() {
          app.quit();
        }
      }
    ]
  };

  var editMenu = getEditMenu(browserWindow, notation);

  var windowMenu = {
    id: 'window',
    label: 'Window',
    submenu: [
      {
        id: 'zoomIn',
        label: 'Zoom In',
        accelerator: 'CommandOrControl+=',
        click: function() {
          browserWindow.webContents.send('editor.actions', {
            event: 'editor.stepZoom',
            data: {
              value: 1
            }
          });
        }
      },
      {
        id: 'zoomIn',
        label: 'Zoom Out',
        accelerator: 'CommandOrControl+-',
        click: function() {
          browserWindow.webContents.send('editor.actions', {
            event: 'editor.stepZoom',
            data: {
              value: -1
            }
          });
        }
      },
      {
        id: 'zoomDefault',
        label: 'Zoom Default',
        accelerator: 'CommandOrControl+0',
        click: function() {
          browserWindow.webContents.send('editor.actions', {
            event: 'editor.zoom',
            data: {
              value: 1
            }
          });
        }
      },
      {
        type: 'separator'
      },
      {
        id: 'reload',
        label: 'Reload',
        accelerator: 'CommandOrControl+R',
        click: function() {
          browserWindow.reload();
        }
      },
      {
        id: 'fullscreen',
        label: 'Fullscreen',
        accelerator: 'F11',
        click: function() {
          if (browserWindow.isFullScreen()) {
            return browserWindow.setFullScreen(false);
          }

          browserWindow.setFullScreen(true);
        }
      },
      {
        id: 'devTools',
        label: 'Toggle DevTools',
        accelerator: 'F12',
        click: function() {
          browserWindow.toggleDevTools();
        }
      }
    ]
  };

  var helpMenu = {
    label: 'Help',
    submenu: [
      {
        label: 'Forum (bpmn.io)',
        click: function() {
          browserOpen('https://forum.bpmn.io/');
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'BPMN 2.0 Tutorial',
        click: function() {
          browserOpen('https://camunda.org/bpmn/tutorial/');
        }
      },
      {
        label: 'BPMN Modeling Reference',
        click: function() {
          browserOpen('https://camunda.org/bpmn/reference/');
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'DMN 1.1 Tutorial',
        click: function() {
          browserOpen('https://camunda.org/dmn/tutorial/');
        }
      }
    ]
  };

  return [
    fileMenu,
    editMenu,
    windowMenu,
    helpMenu
  ];
};
