'use strict';

var background = require('./background');
var foreground = require('./foreground');
var main = require('./main');

var electronProcess = {
  background: background,
  foreground: foreground,
  main: main
};

module.exports = electronProcess;