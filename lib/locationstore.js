var log = require("./log")("lsto");
var utils = require("./utils"),
    ObjectID = require('mongodb').ObjectID;

function create(mongodb, callback) {
    var collection;

    mongodb.createCollection("locations", { w: 1 }, function (error, coll) {
        if (error) {
            callback(error)
            return;
        }

        collection = coll;
        coll.ensureIndex({ email: 1 }, { w: 1 }, function (error, results) {
            if (error) {
                callback(error);
                return;
            }

            callback(null, {
                recordPosition: recordPosition,
                getLastPosition: getLastPosition
            });
        });
    });

    //Location record format
    //{
    //    email: [String],
    //    latitude: [Number],
    //    longitude: [Number],
    //    timestamp: [Date]
    //}

    function recordPosition(userPosition) {
        if (!utils.isString(userPosition.email))
            throw new Error("Location doesn't have a valid email.");
        if (!utils.isNumber(userPosition.latitude))
            throw new Error("Location doesn't have a valid latitude.");
        if (!utils.isNumber(userPosition.longitude))
            throw new Error("Location doesn't have a valid longitude.");
        if (!utils.isDate(userPosition.timestamp))
            throw new Error("Location doesn't have a valid timestamp.");

        var record = {
            email: userPosition.email,
            latitude: userPosition.latitude,
            longitude: userPosition.longitude,
            timestamp: userPosition.timestamp
        };

        collection.find({ email: userPosition.email }).sort([["timestamp", -1]]).toArray(function (error, items) {
            if (error)
            {
                log("Error retreiving past locations, location update dropped. " + error);
                return;
            }
            var currentMinute = Math.floor(record.timestamp.getTime() / 60000);

            var updated = false;
            if (items.length > 0) {
                var lastItem = items[0];
                var lastItemMinute = Math.floor(lastItem.timestamp.getTime() / 60000);
                if (lastItemMinute >= currentMinute) {
                    updated = true;
                    record._id = lastItem._id;try
                    {
                        collection.update({ _id: lastItem._id }, record, { w: 0 });
                    }
                    catch (e) {
                        log("Location update error: " + e);
                    }
                    log("Location Updated.");
                }
            }
            if (!updated) {
                try
                {
                    collection.insert(record, { w: 0 });
                }
                catch (e)
                {
                    log("Location insertion error: " + e);
                }
                log("Location inserted.");
            }

            var whileAgo = new Date(record.timestamp.getTime() - 30 * 60000);

            try
            {
                collection.remove({ email: userPosition.email, timestamp: { $lte: whileAgo } }, { w: 0 });
            }
            catch (e)
            {
                log("Location pruning error: " + e)
            }
        });
    }

    function getLastPosition(email, callback) {
        collection.find({ email: email }).sort([["timestamp",-1]]).toArray(function (error, items) {
            if (error) {
                callback(error);
                return;
            }

            if (items.length > 0) {
                callback(null, items[0]);
            }
            else
                callback(null, null);
        });

    }
}
exports.create = create;