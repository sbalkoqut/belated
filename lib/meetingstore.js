var log = require("./log")("msto");
var utils = require("./utils"),
    ObjectID = require('mongodb').ObjectID;

function create(mongodb, callback) {
    var collection;
    try
    {
        mongodb.createCollection("meetings", { w: 1 }, function (error, coll) {
            if (error) {
                callback(error)
                return;
            }

            try
            {
                collection = coll;
                coll.ensureIndex({ start: 1 }, { w: 1 }, function (error, results) {
                    if (error) {
                        callback(error);
                        return;
                    }

                    try
                    {
                        callback(null, {
                            add: add,
                            get: get,
                            updateNotifiedLatePersons: updateNotifiedLatePersons,
                            updateCoordinate: updateCoordinate,
                            remove: remove,
                            findMeetingsWithin: findMeetingsWithin
                        });
                    }
                    catch (e)
                    {
                        log("Error in callback after #create");
                    }
                });
            }
            catch (e)
            {
                log("Error creating index for meeting start time.");
            }
        });
    }
    catch(e)
    {
        log("Error creating meeting collection.");
    }

    //  Meeting record format:
    // {
    //    location: [String],
    //    isGeocoded: [Boolean],
    //    latitude: [Number],
    //    longitude: [Number],
    //    start: [Date],
    //    end: [Date],
    //    organiser: { name: [String], email: [String], notifiedLate: [Boolean] },
    //    attendees: [ { name: [String], email: [String], notifiedLate: [Boolean] }, ... ],
    //    subject: [String],
    //    description: [String],
    //    emailId: [String]
    // };

    function sanitise(meeting)
    {
        if (!utils.isObject(meeting))
            throw new Error("No meeting specified.");
        if (!utils.isDate(meeting.start))
            throw new TypeError("Meeting doesn't have a valid start date.");
        if (!utils.isDate(meeting.end))
            throw new TypeError("Meeting doesn't have a valid end date.");
        if (!utils.isString(meeting.location))
            throw new TypeError("Meeting doesn't have a valid location name.");

        if (utils.isBoolean(meeting.isGeocoded)) {
            if (meeting.isGeocoded && !utils.isNumber(meeting.latitude))
                throw new TypeError("Meeting doesn't have a valid latitude.");
            if (meeting.isGeocoded && !utils.isNumber(meeting.longitude))
                throw new TypeError("Meeting doesn't have a valid longitude.");
            if (meeting.latitude > 90 || meeting.latitude < -90)
                throw new RangeError("Meeting latitude must be between -90 and 90.");
            if (meeting.longitude > 180 || meeting.longitude < -180)
                throw new RangeError("Meeting longitude must be between -180 and 180.");
        }
        else
            throw new TypeError("Meeting doesn't have a valid geocoded property.")

        if (!utils.isString(meeting.subject))
            throw new TypeError("Meeting doesn't have a valid subject.");
        if (!utils.isString(meeting.description))
            throw new TypeError("Meeting doesn't have a valid description.");
        if (!utils.isString(meeting.emailId))
            throw new TypeError("Meeting doesn't have a valid email ID.");

        if (!utils.isObject(meeting.organiser) || !utils.isString(meeting.organiser.name) || !utils.isString(meeting.organiser.email))
            throw new TypeError("Meeting doesn't have a valid organiser.");
        if (meeting.organiser.notifiedLate !== undefined && !utils.isBoolean(meeting.organiser.notifiedLate))
            throw new TypeError("Meeting organiser doesn't have a valid notified late value.")
        

        if (!utils.isArray(meeting.attendees))
            throw new TypeError("Meeting doesn't have a valid attendees list.");

        for (var i = 0; i < meeting.attendees.length; i++) {
            var attendee = meeting.attendees[i];
            if (!utils.isObject(attendee) || !utils.isString(attendee.name) || !utils.isString(attendee.email))
                throw new TypeError("Meeting has an invalid attendee.");
            if (attendee.notifiedLate !== undefined && !utils.isBoolean(attendee.notifiedLate))
                throw new TypeError("Meeting attendee has an invalid attendee notified late value.");
        }

        var record = {
            start: meeting.start,
            end: meeting.end,
            location: meeting.location,
            isGeocoded: meeting.isGeocoded,
            latitude: meeting.isGeocoded ? meeting.latitude : null,
            longitude: meeting.isGeocoded ? meeting.longitude : null,
            subject: meeting.subject,
            description: meeting.description,
            emailId: meeting.emailId,
            organiser: { name: meeting.organiser.name, email: meeting.organiser.email, notifiedLate: false },
            attendees: []
        };
        if (meeting.organiser.notifiedLate === true)
            record.organiser.notifiedLate = true;

        for (var i = 0; i < meeting.attendees.length; i++) {
            var attendee = { name: meeting.attendees[i].name, email: meeting.attendees[i].email, notifiedLate: false };
            if (meeting.attendees[i].notifiedLate === true)
                attendee.notifiedLate = true;

            record.attendees.push(attendee);
        }
        return meeting;
    }

    function add(meeting, callback) {

        var record = sanitise(meeting);
        if (record._id)
            throw new RangeError("The meeting already exists in the database.");
        record._id = new ObjectID();
        try
        {
            collection.insert(record, { w: 1 }, function (error, result)
            {
                try
                {
                    if (error) {
                        callback(error);
                    }
                    else {
                        callback(null);
                    }
                }
                catch (e)
                {
                    log("Error in callback after #add. " + e)
                }
            });
        }
        catch(error)
        {
            log("Error inserting meeting. " + error);
            callback(error);
        }
    }

    function updateNotifiedLatePersons(meeting, personsNotifiedLate, callback) {
        function delta(record, persons)
        {
            if (!utils.isArray(personsNotifiedLate))
                throw new TypeError("Persons notified late must be an array.");
            var update = {
                $set: {}
            };

            for (var i = 0; i < personsNotifiedLate.length; i++) {
                var person = personsNotifiedLate[i];
                if (record.organiser === person) {
                    if (!record.organiser.notifiedLate) {
                        update.$set["organiser.notifiedLate"] = true;
                        record.organiser.notifiedLate = true;
                    }
                }
                else {
                    var attendeeNumber = record.attendees.indexOf(person);
                    if (attendeeNumber >= 0) {
                        var attendee = record.attendees[attendeeNumber];
                        if (!attendee.notifiedLate) {
                            update.$set["attendees." + attendeeNumber.toString() + ".notifiedLate"] = true;
                            attendee.notifiedLate = true;
                        }
                    }
                    else {
                        throw new RangeError("An attendee specified isn't a member of the meeting.");
                    }
                }
            }
            return update;
        }
        
        var record = sanitise(meeting);
        if (!utils.isObject(meeting._id))
            throw new RangeError("Meeting not previously stored in database.");

        var update = delta(record, personsNotifiedLate);
        
        doUpdateUnchecked(meeting, update, callback);
    }

    function updateCoordinate(meeting, coordinate, callback) {
        function delta(record, coordinates)
        {
            if (!utils.isObject(coordinate))
                throw new TypeError("A valid coordinate pair must be specified.");
            if (!utils.isNumber(coordinate.latitude))
                throw new TypeError("Coordinate latitude must be a number.");
            if (!utils.isNumber(coordinate.longitude))
                throw new TypeError("Coordinate longitude must be a number.");
            if (coordinate.latitude > 90 || coordinate.latitude < -90 || !coordinate.latitude)
                throw new RangeError("Coordinate latitude must be between -90 and 90.");
            if (coordinate.longitude > 180 || coordinate.longitude < -180 || !coordinate.longitude)
                throw new RangeError("Coordinate longitude must be between -180 and 180.");

            var update = {
                $set: {
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    isGeocoded: true
                }
            };
            record.latitude = coordinates.latitude;
            record.longitude = coordinates.longitude;
            record.isGeocoded = true;
            return update;
        }

        var record = sanitise(meeting);
        
        if (!utils.isObject(meeting._id))
            throw new RangeError("Meeting not previously stored in database.");

        var update = delta(record, coordinate);

        doUpdateUnchecked(meeting, update, callback);
    }

    function doUpdateUnchecked(meeting, update, callback)
    {
        try {
            collection.update({ _id: meeting._id }, update, { w: 1 }, function (error, result) {
                try {
                    if (error) {
                        callback(error);
                    }
                    else {
                        callback(null);
                        log("Meeting update success. ")
                    }
                }
                catch (e) {
                    log("Error in callback after meeting update. " + e)
                }
            });
        }
        catch (error) {
            log("Error updating meeting. " + error);
            callback(error);
        }
    }

    function get(id, callback)
    {
        if (!utils.isString(id))
            throw new TypeError("The ID must be a string or an ObjectID.");

        var validHexID = /^[0-9a-f]{24}$/;
        if (!id.match(validHexID))
            throw new RangeError("Invalid ID.");
     
        var objId = ObjectID.createFromHexString(id);
        try {
            collection.findOne({ _id: objId }, function (error, document) {
                try
                {
                    callback(error, document);
                }
                catch (e)
                {
                    log("Error in callback after #get. " + e)
                }
            });
        }
        catch (error)
        {
            callback(error);
            log("Error getting meeting. " + error)
        }
    }

    function remove(meeting, callback) {
        if (meeting === undefined)
            throw new Error("A meeting must be specified.");
        if (meeting._id === undefined)
            throw new Error("The meeting must have been assigned an id.");

        try
        {
            collection.remove({ _id: meeting._id }, { w: 1 }, function (error, result)
            {
                try
                {
                    if (error)
                        callback(error);
                    else
                        callback(null);
                }
                catch (e)
                {
                    log("Error in callback after #remove. " + e)
                }
            });
        }
        catch (error)
        {
            log("Error removing meeting. " + error);
            callback(error);
        }
    }

    function findMeetingsWithin(earliestStart, latestStart, callback) {
        if (!utils.isDate(earliestStart))
            throw new Error("Invalid start date provided.");
        if (!utils.isDate(latestStart))
            throw new Error("Invalid end date provided.");
        if (callback === undefined)
            throw new Error("Invalid callback provided.");
        
        try
        {
            collection.find({ start: { $gte: earliestStart, $lte: latestStart } }).toArray(function (error, items) {
                try
                {
                    callback(error, items);
                }
                catch (e)
                {
                    log("Error in callback after #findMeetingsWithin. " + e)
                }
            });
        }
        catch (error)
        {
            callback(error);
            log("Error finding meetings. " + error)
        }
    }

}
exports.create = create;