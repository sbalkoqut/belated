var MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    format = require('util').format;

var connectionString = require("./config")().mongoconnection,
    log = require("./log")("mongo"),
    meetingStore = require("./meetingstore"),
    locationStore = require("./locationstore");

function connect(callback) {

    MongoClient.connect(connectionString, function (error, db) {
        if (error || !db) {
            log("Couldn't connect to database. " + error);
            callback(error);
            return;
        }

        meetingStore.create(db, function (error, mStore) {
            if (error || !mStore) {
                log("Unable to create meeting store.");
                callback(error);
                return;
            }
            try
            {
                locationStore.create(db, function (error, lStore) {
                    if (error || !lStore) {
                        log("Unable to create location store.");
                        callback(error);
                        return;
                    }
                    try {
                        callback(null, { meetings: mStore, locations: lStore });
                    }
                    catch (e) {
                        log("Error in callback after connecting to persistancy: " + e.stack);
                    }
                });
            }
            catch (e) {
                log("Error creating location store : " + e);
            }
        });
    });
}

exports.connect = connect;