'use strict';

var _ = require('lodash');

var _require = require('electron');

var BrowserWindow = _require.BrowserWindow;
var ipcMain = _require.ipcMain;

var foregroundWindows = [];
var backgroundProcessHandler = {
  addWindow: function addWindow(browserWindow) {
    foregroundWindows.push(browserWindow);
  }
};

function sendToAllForegroundWindows(eventName, payload) {
  _.forEach(foregroundWindows, function (foregroundWindow) {
    foregroundWindow.webContents.send.apply(foregroundWindow.webContents, [eventName, payload]);
  });
}

var main = {
  createBackgroundProcess: function createBackgroundProcess(url, debug) {
    var backgroundWindow = new BrowserWindow();
    if (!debug) {
      backgroundWindow.hide();
    }
    backgroundWindow.loadURL(url);

    ipcMain.on('BACKGROUND_START', function (event, result) {
      backgroundWindow.webContents.send.apply(backgroundWindow.webContents, ['BACKGROUND_START', result]);
    });

    ipcMain.on('BACKGROUND_REPLY', function (event, result) {
      sendToAllForegroundWindows('BACKGROUND_REPLY', result);
    });

    ipcMain.on('CALLBACK', function (event, payload) {
      sendToAllForegroundWindows('CALLBACK', payload);
    });
    return backgroundProcessHandler;
  }
};

module.exports = main;