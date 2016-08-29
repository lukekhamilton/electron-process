'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var _ = require('lodash');
var objectHash = require('object-hash');

var _require = require('electron');

var ipcRenderer = _require.ipcRenderer;


var backgroundTasks = {};
var hasRegisteredListeners = false;

function turnCallbackIntoIpcCall(functionId) {
  return function () {
    // Filter all non-enumarable properties
    var args = _.map(arguments, function (argument) {
      return argument;
    });

    ipcRenderer.send('CALLBACK', {
      functionId: functionId,
      args: args
    });
  };
}

function registerListeners() {
  ipcRenderer.on('BACKGROUND_START', function (event, payload) {
    var moduleHash = payload.moduleHash;
    var funcName = payload.funcName;
    var args = payload.args;
    var eventKey = payload.eventKey;

    // In order for callbacks to execute in the foreground they
    // must be replaced with an IPC call

    var argsWithCallbacksReplaced = _.map(args, function (arg) {
      return _.get(arg, '$isFunction') ? turnCallbackIntoIpcCall(arg.functionId) : arg;
    });

    Promise.resolve().then(function () {
      var _backgroundTasks$modu;

      return (_backgroundTasks$modu = backgroundTasks[moduleHash])[funcName].apply(_backgroundTasks$modu, _toConsumableArray(argsWithCallbacksReplaced));
    }).then(function (result) {
      ipcRenderer.send('BACKGROUND_REPLY', {
        result: result,
        eventKey: eventKey,
        resultType: 'BACKGROUND_RESOLVE'
      });
    }).catch(function (reason) {
      ipcRenderer.send('BACKGROUND_REPLY', {
        reason: reason,
        eventKey: eventKey,
        resultType: 'BACKGROUND_REJECT'
      });
    });
  });
}

var background = {
  registerModule: function registerModule(backgroundModule) {
    if (!hasRegisteredListeners) {
      registerListeners();
      hasRegisteredListeners = true;
    }
    backgroundTasks[objectHash(backgroundModule)] = backgroundModule;
  }
};

module.exports = background;