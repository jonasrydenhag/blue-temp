#!/usr/bin/env node

'use strict';

var debug = require('debug')('blueTemp');
var Promise = require('promise');
var sensor = require('./lib/sensor');
var storage = require('./lib/storage');

function readAndStore () {
  return new Promise(function (resolve, reject) {
    sensor.read()
      .then(function (tempHum) {
        storage.store(tempHum)
          .then(function () {
            resolve(tempHum);
          })
          .catch(reject);
      })
      .catch(reject);
  });
}

(function(){
  module.exports.batteryLevel = sensor.battery;
  module.exports.read = sensor.read;
  module.exports.readAndStore = readAndStore;

  if (module.parent === null) {
    readAndStore()
      .then(function (tempHum) {
        debug(tempHum);
        console.log('Temperature: ' + tempHum.temperature.toFixed(1) + '°C, ' +
          'Humidity: ' + tempHum.humidity.toFixed(1) + '%');

        process.exit();
      })
      .catch(function (ex) {
        debug(ex);
        console.log(ex);
        process.exit(1);
      });
  }
})();
