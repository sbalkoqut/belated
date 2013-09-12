var MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    format = require('util').format;

var connectionString = require("./config")().mongoconnection,
    log = require("./log")("mongo"),
    meetingStore = require("./meetingstore"),
    locationStore = require("./locationstore");


function connect(callback) {
    var mStore;
    var lStore;

    MongoClient.connect(connectionString, function (error, db) {

        if (error) {
            log("Couldn't connect to database. " + error);
        }
        if (db != null) {
            meetingStore.create(db, function (error, store) {

                if (error) {
                    log("Unable to create meeting store.");
                    callback(error);
                }
                else {
                    mStore = store;
                    try {

                        locationStore.create(db, function (error, store) {
                            if (error) {
                                log("Unable to create location store.");
                                callback(error);
                            }
                            else {

                                lStore = store;
                                try
                                {
                                    callback(null, { meetings: mStore, locations: lStore });
                                }
                                catch (e) {
                                    log("Error in callback after connecting to persistancy: " + e.stack);
                                }
                            }
                        });
                    }
                    catch (e) {
                        log("Error creating location store : " + e);
                    }
                }
            });
        }
    });
}

exports.connect = connect;