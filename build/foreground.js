'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var uuid = require('uuid');
var _ = require('lodash');
var objectHash = require('object-hash');

var _require = require('electron');

var ipcRenderer = _require.ipcRenderer;


function taskCompleteCallback(eventKey, resolve, reject, event, data) {
  var resultType = data.resultType;
  var result = data.result;
  var reason = data.reason;
  var replyEventKey = data.eventKey;


  if (replyEventKey === eventKey) {
    switch (resultType) {
      case 'BACKGROUND_RESOLVE':
        ipcRenderer.removeListener('BACKGROUND_REPLY', taskCompleteCallback);
        resolve(result);
        break;
      case 'BACKGROUND_REJECT':
        ipcRenderer.removeListener('BACKGROUND_REPLY', taskCompleteCallback);
        reject(reason);
        break;
      default:
    }
  }
}

function callbackCallback(functionsById, event, data) {
  var functionId = data.functionId;
  var args = data.args;

  if (functionsById[functionId]) {
    functionsById[functionId].apply(functionsById, _toConsumableArray(args));
  }
}

function run(moduleHash, funcName, args) {
  var _this = this;

  var eventKey = uuid.v4();

  var functionsById = {};
  var argsWithCallbacksReplaced = _.map(args, function (arg) {
    if (!_.isFunction(arg)) {
      return arg;
    }

    var functionId = uuid.v4();
    functionsById[functionId] = arg;
    return {
      $isFunction: true,
      functionId: functionId
    };
  });

  var payload = {
    moduleHash: moduleHash,
    funcName: funcName,
    args: argsWithCallbacksReplaced,
    eventKey: eventKey
  };

  return new Promise(function (resolve, reject) {
    if (_.some(args, _.isFunction)) {
      // When a callback is executed in the background process it sends an
      // IPC event named 'CALLBACK'.
      ipcRenderer.on('CALLBACK', callbackCallback.bind(_this, functionsById));
    }
    ipcRenderer.on('BACKGROUND_REPLY', taskCompleteCallback.bind(_this, eventKey, resolve, reject));
    ipcRenderer.send('BACKGROUND_START', payload);
  });
}

var foreground = {
  getModule: function getModule(originalModule) {
    var promiseWrappedModule = {};
    var moduleHash = objectHash(originalModule);
    _.forEach(originalModule, function (func, funcName) {
      if (_.isFunction(func)) {
        promiseWrappedModule[funcName] = function () {
          // Remove non-enumarable properties of arguments
          var args = _.map(arguments, function (element) {
            return element;
          });
          return run(moduleHash, funcName, args);
        };
      }
    });
    return promiseWrappedModule;
  }
};

module.exports = foreground;