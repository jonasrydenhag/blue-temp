"use strict";

var config = require('../config.json');
var debug = require('debug')('blueTemp');
var noble = require('noble');
var Promise = require('promise');

var peripheralId = config.peripheralId;
var serviceUUID = '181a';
var tempCharacteristicUUID = '2a6e';

var promiseResolve = null;
var promiseReject = null;
var peripheral;

function readTemp() {
  noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      debug("Start scanning");
      startScanning();
      setScanningTimeout();
    } else {
      stopScanning();
    }
  });

  noble.on('discover', function(foundPeripheral) {
    if (foundPeripheral.id === peripheralId || foundPeripheral.address === peripheralId) {
      noble.stopScanning();
      debug("Found " + foundPeripheral.id);

      foundPeripheral.on('disconnect', function() {
        exit();
      });

      peripheral = foundPeripheral;

      connect(peripheral);
    }
  });

  if (promiseResolve === null) {
    return new Promise(function (resolve, reject) {
      promiseResolve = resolve;
      promiseReject = reject;
    })
      .finally(function () {
        promiseResolve = null;
        promiseReject = null;
      });
  }
}

function startScanning() {
  noble.startScanning([serviceUUID], false);
}

function stopScanning() {
  noble.stopScanning();
  exit();
}

function exit() {
  if (promiseReject) {
    promiseReject();
  }
}

function connect(peripheral) {

  peripheral.connect(function(error) {
    debug("Connected to peripheral");
    setConnectionTimeout(peripheral);

    if (error) {
      debug(error);
    }

    var characteristicUUIDs = [tempCharacteristicUUID];

    peripheral.discoverServices([serviceUUID], function(error, services) {
      debug("Number of services found " + services.length);
      services.forEach(function (service) {
        debug("Found service with name " + service.name);
        service.discoverCharacteristics(characteristicUUIDs, function(error, characteristics) {
          debug("Number of characteristics found " + characteristics.length);
          characteristics.forEach(function(characteristic) {
            debug("Found characteristic with name " + characteristic.name);

            if (characteristic.uuid === tempCharacteristicUUID) {
              read(characteristic);
            }
          });
        });
      });
    });
  });
}

function read(characteristic) {
  characteristic.read(function(error, data) {
    var value = responseDataToFloat(data);
    debug(value);

    if (promiseResolve && value !== null) {
      promiseResolve(value);
    } else if (promiseReject) {
      promiseReject("Unreadable response");
    }
    disconnect("Disconnect after read");
  });
}

function responseDataToFloat(data) {
  if (data.toString('hex') === '') {
    return null;
  }

  var string = "0x" + data.toString('hex').match(/.{2}/g).reverse().join("");
  var asInt = parseInt(string);
  var asFloat = asInt/100;

  return asFloat;
}

function setScanningTimeout()
{
  var timeout = 10000;

  setTimeout(function () {
    debug("Scanning timed out after " + timeout);
    stopScanning();
  }, timeout);
}

function setConnectionTimeout(peripheral)
{
  var timeout = 5000;

  setTimeout(function () {
    disconnect("Connection to peripheral " + peripheral.id + " timed out after " + timeout);
  }, timeout);
}

function disconnect(reason) {
  if (peripheral) {
    if (reason) {
      debug("Disconnect reason: " + reason)
    }
    peripheral.disconnect();
  }
}

process.on('SIGINT', function () {
  disconnect();
});

module.exports = {
  read: readTemp
};
