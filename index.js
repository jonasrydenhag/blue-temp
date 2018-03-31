"use strict";

var debug = require('debug')('blueTemp');
var noble = require('noble');

var peripheralId = 'id';
var serviceUUID = '181a';
var tempCharacteristicUUID = '2a6e';

var peripheral;

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
      process.exit(0);
    });

    peripheral = foundPeripheral;

    connect(peripheral);
  }
});

function startScanning() {
  noble.startScanning([serviceUUID], false);
}

function stopScanning() {
  noble.stopScanning();
  process.exit(0);
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
    debug("Disconnect after read");
    disconnectPeripheral();
  });
}

function responseDataToFloat(data) {
  var string = "0x" + data.toString('hex').match(/.{2}/g).reverse().join("");
  var asInt = parseInt(string);
  var asFloat = asInt/100;

  return asFloat.toFixed(2);
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
    debug("Connection to peripheral " + peripheral.id + " timed out after " + timeout);
    disconnectPeripheral();
  }, timeout);
}

function disconnect() {
  if (peripheral) {
    disconnectPeripheral(peripheral);
  }
}

function disconnectPeripheral() {
  peripheral.disconnect();
}

process.on('SIGINT', function () {
  disconnect();
});
