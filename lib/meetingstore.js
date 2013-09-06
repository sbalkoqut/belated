var log = require("./log")("msto");
var utils = require("./utils"),
    ObjectID = require('mongodb').ObjectID;

function create(mongodb, callback) {
    var collection;

    mongodb.createCollection("meetings", { w: 1 }, function (error, coll) {
        if (error) {
            callback(error)
            return;
        }

        collection = coll;
        coll.ensureIndex({ start: 1 }, { w: 1 }, function (error, results) {
            if (error) {
                callback(error);
                return;
            }

            callback(null, {
                add: add,
                updateNotifiedLatePersons: updateNotifiedLatePersons,
                remove: remove,
                findMeetingsWithin: findMeetingsWithin
            });
        });
    });

    //  Meeting record format:
    // {
    //    location: [String],
    //    latitude: [Number],
    //    longitude: [Number],
    //    start: [Date],
    //    end: [Date],
    //    organiser: { name: [String], email: [String] },
    //    attendees: [ { name: [String], email: [String] }, ... ],
    //    subject: [String],
    //    description: [String],
    //    emailId: [String]
    // };

    function sanitise(meeting)
    {
        if (!utils.isObject(meeting))
            throw new Error("No meeting specified.");
        if (!utils.isDate(meeting.start))
            throw new Error("Meeting doesn't have a valid start date.");
        if (!utils.isDate(meeting.end))
            throw new Error("Meeting doesn't have a valid end date.");
        if (!utils.isString(meeting.location))
            throw new Error("Meeting doesn't have a valid location name.");

        if (!utils.isNumber(meeting.latitude))
            throw new Error("Meeting doesn't have a valid latitude.");
        if (!utils.isNumber(meeting.longitude))
            throw new Error("Meeting doesn't have a valid longitude.");

        if (!utils.isString(meeting.subject))
            throw new Error("Meeting doesn't have a valid subject.");
        if (!utils.isString(meeting.description))
            throw new Error("Meeting doesn't have a valid description.");
        if (!utils.isString(meeting.emailId))
            throw new Error("Meeting doesn't have a valid email ID.");

        if (!utils.isObject(meeting.organiser) || !utils.isString(meeting.organiser.name) || !utils.isString(meeting.organiser.email))
            throw new Error("Meeting doesn't have a valid organiser.");
        if (meeting.organiser.notifiedLate !== undefined && !utils.isBoolean(meeting.organiser.notifiedLate))
            throw new Error("Meeting doesn't have a valid notified late value.")
        

        if (!utils.isArray(meeting.attendees))
            throw new Error("Meeting doesn't have a valid attendees list.");

        for (var i = 0; i < meeting.attendees.length; i++) {
            var attendee = meeting.attendees[i];
            if (!utils.isObject(attendee) || !utils.isString(attendee.name) || !utils.isString(attendee.email))
                throw new Error("Meeting has an invalid attendee.");
            if (attendee.notifiedLate !== undefined && !utils.isBoolean(attendee.notifiedLate))
                throw new Error("Meeting has an invalid attendee notified late value.");
        }

        var record = {
            start: meeting.start,
            end: meeting.end,
            location: meeting.location,
            latitude: meeting.latitude,
            longitude: meeting.longitude,
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

                        log("Meeting insert success: " + result)
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
        function recordDelta(record, persons)
        {
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
                        throw new Error("An attendee specified isn't a member of the meeting.");
                    }
                }
            }
            return update;
        }

        if (!utils.isArray(personsNotifiedLate))
            throw new Error("Persons notified late must be an array.");

        var record = sanitise(meeting);
        if (!utils.isObject(meeting._id))
            throw new Error("Meeting not previously stored in database.");

        var update = recordDelta(record, personsNotifiedLate);
        
        try
        {
            collection.update({ _id: meeting._id }, update, { w: 1 }, function (error, result) {
                try
                {
                    if (error) {
                        callback(error);
                    }
                    else {
                        callback(null);
                        log("Meeting update success: " + result)
                    }
                }
                catch (e)
                {
                    log("Error in callback after #updateNotifiedLatePersons. " + e)
                }
            });
        }
        catch (error)
        {
            log("Error updating meeting. " + error);
            callback(error);
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