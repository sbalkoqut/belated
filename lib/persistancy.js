var MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    format = require('util').format;

var connectionString = require("./config")().mongoconnection,
    log = require("./log")("mongo"),
    meetingStore = require("./meetingstore"),
    locationStore = require("./locationstore");

var database;
var meetingStore;
var locationStore;
var callback;

function connect(done) {
    callback = done;
    connectToDatabase();
}

function onConnectedToDatabase() {
    createMeetingStore();
}

function onMeetingStoreCreated() {
    createLocationStore();
}

function onLocationStoreCreated() {
    performCallback(null, { meetings: meetingStore, locations: locationStore });
}

function onError(error) {
    performCallback(error);
}

function performCallback(error, result)
{
    try {
        callback(error, result);
    }
    catch (e) {
        log("Error in callback after connecting to persistancy: " + e.stack);
    }
}

function connectToDatabase()
{
    MongoClient.connect(connectionString, function (error, db) {
        if (error || !db) {
            log("Couldn't connect to database. ");
            onError(error);
        }
        else {
            database = db;
            onConnectedToDatabase();
        }
    });
}

function createMeetingStore()
{
    meetingStore.create(database, function (error, mStore) {
        if (error || !mStore) {
            log("Unable to create meeting store.");
            onError(error);
        }
        else {
            meetingStore = mStore;
            onMeetingStoreCreated();
        }
    });
}

function createLocationStore() {
    locationStore.create(database, function (error, lStore) {
        if (error || !lStore) {
            log("Unable to create location store.");
            onError(error);
        }
        else {
            locationStore = lStore;
            onLocationStoreCreated();
        }
    });
}

exports.connect = connect;