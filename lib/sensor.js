"use strict";

var config = require('../config.json');
var debug = require('debug')('blueTemp');
var noble = require('noble');
var Promise = require('promise');

var peripheralId = config.peripheralId;
var serviceUUID = '181a';
var tempCharacteristicUUID = '2a6e';

var currentPeripheral;

var scanningTimeout;
var connectionTimeout;

function readTemp() {
  return new Promise(function (resolve, reject) {
    noble.on('stateChange', function(state) {
      if (state === 'poweredOn') {
        debug("Start scanning");
        startScanning();
        scanningTimeout = setScanningTimeout(reject);
      } else {
        reject("Powered off");
        stopScanning();
      }
    });

    noble.on('discover', function(foundPeripheral) {
      if (foundPeripheral.id === peripheralId || foundPeripheral.address === peripheralId) {
        noble.stopScanning();

        debug("Found", foundPeripheral.id);

        foundPeripheral.on('disconnect', function() {
          reject("Disconnected");
        });

        connect(foundPeripheral)
          .then(resolve)
          .catch(reject)
          .finally(function () {
            disconnect(foundPeripheral);
          });
      }
    });
  }).finally(function () {
    if (scanningTimeout) {
      clearTimeout(scanningTimeout);
    }
  });
}

function startScanning() {
  noble.startScanning([serviceUUID], false);
}

function stopScanning() {
  noble.stopScanning();
}

function connect(peripheral) {
  currentPeripheral = peripheral;

  return new Promise(function (resolve, reject) {
    connectionTimeout = setConnectionTimeout(peripheral, reject);

    peripheral.connect(function (error) {
      if (error) {
        reject(error);
      }

      debug("Connected to peripheral");
      var characteristicUUIDs = [tempCharacteristicUUID];

      peripheral.discoverServices([serviceUUID], function (error, services) {
        if (error) {
          reject(error);
        }

        debug("Number of services found", services.length);
        if (services.length < 1) {
          reject("No services found");
        }

        services.forEach(function (service) {
          debug("Found service with name", service.name);

          service.discoverCharacteristics(characteristicUUIDs, function (error, characteristics) {
            if (error) {
              reject(error);
            }

            debug("Number of characteristics found", characteristics.length);
            if (characteristics.length < 1) {
              reject("No characteristics found");
            }

            characteristics.forEach(function (characteristic) {
              debug("Found characteristic with name", characteristic.name);

              if (characteristic.uuid === tempCharacteristicUUID) {
                read(characteristic)
                  .then(resolve)
                  .catch(reject);
              }
            });
          });
        });
      });
    });
  }).finally(function () {
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
    }
  });
}

function read(characteristic) {
  return new Promise(function (resolve, reject) {
    characteristic.read(function(error, data) {
      if (error) {
        reject(error);
      }

      var value = responseDataToFloat(data);
      debug("Got value", value);

      if (value !== null) {
        resolve(value);
      } else {
        reject("Unreadable response");
      }
    });
  });
}

function responseDataToFloat(data) {
  if (data.toString('hex') === '') {
    return null;
  }

  var string = "0x" + data.toString('hex').match(/.{2}/g).reverse().join("");
  var asInt = parseInt(string);
  return asInt/100;
}

function setScanningTimeout(reject) {
  var timeout = 10000;

  return setTimeout(function () {
    reject("Scanning timed out after " + timeout);
    stopScanning();
  }, timeout);
}

function setConnectionTimeout(peripheral, reject) {
  var timeout = 5000;

  return setTimeout(function () {
    reject("Connection to peripheral " + peripheral.id + " timed out after " + timeout);
  }, timeout);
}

function disconnect(peripheral) {
  peripheral.disconnect();
}

process.on('SIGINT', function () {
  disconnect(currentPeripheral);
});

module.exports = {
  read: readTemp
};
