'use strict';

var config = require('../config.json');
var firebase = require('firebase-admin');

var serviceAccount = require('../firebase-account.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: config.firebase.databaseURL
});

var db = firebase.database();
//@todo Connect to real db
var tempHumRef = db.ref("tempHum-test");

function pushTempHum(tempHum) {
  return tempHumRef
    .push({
      temperature: tempHum.temperature,
      humidity: tempHum.humidity,
      createDate: firebase.database.ServerValue.TIMESTAMP
    });
}

module.exports = {
  store: pushTempHum
};
