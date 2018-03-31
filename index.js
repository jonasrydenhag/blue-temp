#!/usr/bin/env node

'use strict';

var debug = require('debug')('blueTemp');
var Promise = require('promise');
var sensor = require('./lib/sensor');
var storage = require('./lib/storage');

function read () {
  return new Promise(function (resolve, reject) {
    sensor.read()
      .then(function (temperature) {
        resolve({
          "temperature": temperature
        });
      })
      .catch(function (ex) {
        reject(ex);
      });

  });
}

function readAndStore () {
  return new Promise(function (resolve, reject) {
    read()
      .then(function (tempHum) {
        storeTempHum(tempHum)
          .then(function () {
            resolve(tempHum);
          })
          .catch(function (ex) {
            reject(ex);
          });
      })
      .catch(function (ex) {
        reject(ex);
      });
  });
}

function storeTempHum (tempHum) {
  return new Promise(function (resolve, reject) {
    storage.store(tempHum)
      .then(function () {
        resolve();
      })
      .catch(function (ex) {
        reject(ex);
      });
  });
}

(function(){
  module.exports.read = read;
  module.exports.readAndStore = readAndStore;

  if (module.parent === null) {
    readAndStore()
      .then(function (tempHum) {
        debug(tempHum);
        console.log('Temperature: ' + tempHum.temperature.toFixed(1) + '°C');

        process.exit();
      })
      .catch(function (ex) {
        debug(ex);
        console.log(ex);
        process.exit(1);
      });
  }
})();
