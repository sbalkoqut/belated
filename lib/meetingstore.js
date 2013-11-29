var log = require("./log")("msto");
var utils = require("./utils"),
    ObjectID = require('mongodb').ObjectID;
var validate = require("./validationhelper");

function create(mongodb, callback) {

    var collection;

    try
    {
        function ensureIndexes(collection, indexes, callback)
        {
            if (indexes.length === 0) {
                try
                {
                    callback(null);
                }
                catch (e)
                {
                    log.error("Error in callback after #ensureIndexes. " + e.stack);
                }
                return;

            }
            var index = indexes.shift();
            collection.ensureIndex(index, { w: 1 }, function (error, results) {
                if (error)
                {
                    callback(error);
                    return;
                }
                try
                {
                    ensureIndexes(collection, indexes, callback);
                }
                catch(e)
                {
                    log.error("Error after creating meeting index " + index + " : " + e.stack);
                }
            });
        }

        mongodb.createCollection("meetings", { w: 1 }, function (error, coll) {
            if (error) {
                callback(error)
                return;
            }

            try
            {
                var indexes = [
                    { "start": 1 },
                    { "organiser.email": 1 },
                    { "attendees.email": 1 },
                    { "organiser.email": 1, "calUId": 1 }
                ];

                collection = coll;
                ensureIndexes(coll, indexes, function (error) {
                    if (error) {
                        callback(error);
                        return;
                    }
                    callback(null, {
                        add: add,
                        get: get,
                        updateDetail: updateDetail,
                        updateNotifiedLatePersons: updateNotifiedLatePersons,
                        updateCoordinate: updateCoordinate,
                        updateTracking: updateTracking,
                        updateTravelPlan: updateTravelPlan,
                        remove: remove,
                        findMeetingsWithin: findMeetingsWithin,
                        findMeetingsFor: findMeetingsFor,
                        findMeetingBy: findMeetingBy
                    });
                });
            }
            catch (e)
            {
                log.error("Error creating indexes. " + e.stack);
            }
        });
    }
    catch(e)
    {
        log.error("Error creating meeting collection.");
    }

    //  Meeting record format:
    // {
    //    location: [String],
    //    isLocationDetermined: [Boolean],
    //    latitude: [Number],
    //    longitude: [Number],
    //    start: [Date],
    //    end: [Date],
    //    organiser: { name: [String], email: [String], notifiedLate: [Boolean], track: [Boolean], travelMode: [String], travelEta: [Date] },
    //    attendees: [ { name: [String], email: [String], notifiedLate: [Boolean], track: [Boolean] travelMode: [String], travelEta: [Date], deleted: [Boolean] }, ... ],
    //    subject: [String],
    //    description: [String],
    //    emailId: [String],
    //    calUId: [String],
    //    calSequence: [Number],
    //    conferenceURL: [String]
    // };

    function sanitise(meeting, options)
    {
        function replaceObjectContent(object, newValues)
        {
            for (var key in object) {
                if (!object.hasOwnProperty(key))
                    throw new TypeError("No meeting objects may inherit from any others.");
                object[key] = undefined;
            }
            for (var key in newValues)
            {
                object[key] = newValues[key];
            }
            return object;
        }

        if (!utils.isObject(options))
            options = {};

        if (!utils.isObject(meeting))
            throw new Error("No meeting specified.");
        if (!utils.isDate(meeting.start))
            throw new TypeError("Meeting doesn't have a valid start date.");
        if (!utils.isDate(meeting.end))
            throw new TypeError("Meeting doesn't have a valid end date.");
        if (!utils.isString(meeting.location))
            throw new TypeError("Meeting doesn't have a valid location name.");

        if (!utils.isBoolean(meeting.isLocationDetermined))
            throw new TypeError("Meeting has an invalid isLocationDetermined property.");
        if (!utils.isNumber(meeting.latitude))
            throw new TypeError("Meeting doesn't have a valid latitude.");
        if (!utils.isNumber(meeting.longitude))
            throw new TypeError("Meeting doesn't have a valid longitude.");
        if (meeting.latitude > 90 || meeting.latitude < -90)
            throw new RangeError("Meeting latitude must be between -90 and 90.");
        if (meeting.longitude > 180 || meeting.longitude < -180)
            throw new RangeError("Meeting longitude must be between -180 and 180.");

        if (!utils.isString(meeting.subject))
            throw new TypeError("Meeting has an invalid subject.");
        if (!utils.isString(meeting.description))
            throw new TypeError("Meeting has an invalid description.");
        if (!utils.isString(meeting.emailId))
            throw new TypeError("Meeting has an invalid email ID.");
        if (!utils.isString(meeting.calUId))
            throw new TypeError("Meeting has an invalid calendar UID");
        if (!utils.isNumber(meeting.calSequence))
            throw new TypeError("Meeting has an invalid calendar Sequence");
        
        function validatePerson(person, propertyName)
        {
            if (!utils.isObject(person) || !utils.isString(person.name) || !utils.isString(person.email))
                throw new TypeError("Meeting has an invalid " + propertyName + ".");
            if (person.notifiedLate !== undefined && !utils.isBoolean(person.notifiedLate))
                throw new TypeError("Meeting " + propertyName + " has an invalid notified late value.");
            if (!utils.isBoolean(person.track))
                throw new TypeError("Meeting " + propertyName + " has an invalid tracking value.");
            if (propertyName !== "organiser")
            {
                if (person.deleted !== undefined && !utils.isBoolean(person.deleted))
                    throw new TypeError("Meeting " + propertyName + " has an invalid deleted flag value.");
            }
            if (person.travelMode !== undefined || person.travelEta !== undefined) {
                if (!validate.travel(person.travelMode, person.travelEta))
                    throw new TypeError("Meeting " + propertyName + " has an invalid travelMode and/or travelEta.");
            }
        }
        validatePerson(meeting.organiser, "organiser");

        if (meeting.conferenceURL !== null && !utils.isString(meeting.conferenceURL))
            throw new TypeError("Meeting conference URL has an invalid value.");

        if (!utils.isArray(meeting.attendees))
            throw new TypeError("Meeting doesn't have a valid attendees list.");

        for (var i = 0; i < meeting.attendees.length; i++) {
            var attendee = meeting.attendees[i];
            validatePerson(attendee, "attendee #" + i.toString());
        }

        var record = {
            _id: meeting._id,
            start: meeting.start,
            end: meeting.end,
            location: meeting.location,
            isLocationDetermined: meeting.isLocationDetermined,
            latitude: meeting.latitude ? meeting.latitude : null,
            longitude: meeting.longitude ? meeting.longitude : null,
            subject: meeting.subject,
            description: meeting.description,
            emailId: meeting.emailId,
            calUId: meeting.calUId,
            calSequence: meeting.calSequence,
            organiser: { name: meeting.organiser.name, email: meeting.organiser.email, notifiedLate: false, track: meeting.organiser.track },
            attendees: [],
            conferenceURL: meeting.conferenceURL
        };

        function sanitisePerson(originalPerson, propertyName)
        {
            var person = { name: originalPerson.name, email: originalPerson.email, notifiedLate: false, track: originalPerson.track, travelMode: "unspecified", travelEta: null };
            if (propertyName !== "organiser")
            {
                person.deleted = (originalPerson.deleted === true && !options.ignoreDeleted);
            }
            if (originalPerson.notifiedLate === true && !options.ignoreNotifiedLate)
                person.notifiedLate = true;
            if (originalPerson.travelMode !== undefined && !options.ignoreTravelPlan)
                person.travelMode = originalPerson.travelMode;
            if (originalPerson.travelEta !== undefined && !options.ignoreTravelPlan)
                person.travelEta = originalPerson.travelEta;
            
            person = replaceObjectContent(originalPerson, person);
            return person;
        }

        record.organiser = sanitisePerson(meeting.organiser, "organiser");

        for (var i = 0; i < meeting.attendees.length; i++) {
            var attendee = sanitisePerson(meeting.attendees[i], "attendee");
            record.attendees.push(attendee);
        }

        meeting = replaceObjectContent(meeting, record);
        return meeting;
    }

    function add(meeting, callback) {

        var record = sanitise(meeting, {
            ignoreNotifiedLate: true,
            ignoreDeleted: true,
            ignoreTravelPlan: true
        });
        if (record._id !== undefined)
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
                    log.error("Error in callback after #add. " + e)
                }
            });
        }
        catch(error)
        {
            log.error("Error inserting meeting. " + error);
            callback(error);
        }
    }

    function updateDetail(meeting, detail, callback)
    {
        function delta(existing, updated)
        {
            function addAttendeesDelta(update, existing, updated, startTimeChanged)
            {
                function addAttendeeDelta(update, attendeePath, existingAttendee, updatedAttendee, startTimeChanged)
                {
                    var included = true;
                    if (attendeePath !== "organiser") {
                        included = (existingAttendee.deleted !== true);
                        var include = (updatedAttendee !== null);

                        if (included !== include) {
                            update.$set[attendeePath + ".deleted"] = !include;
                            existingAttendee.deleted = !include;
                        }
                        if (!include)
                            return update;
                    }

                    if (existingAttendee.name !== updatedAttendee.name)
                    {
                        update.$set[attendeePath + ".name"] = updatedAttendee.name;
                        existingAttendee.name = updatedAttendee.name;
                    }
                    if (existingAttendee.track !== updatedAttendee.track)
                    {
                        // Do nothing. Don't overwrite tracking settings which may have been altered via web UI.
                    }
                    if ((startTimeChanged || !included))
                    {
                        if (existingAttendee.notifiedLate) {
                            update.$set[attendeePath + ".notifiedLate"] = false;
                            existingAttendee.notifiedLate = false;
                        }
                        if (existingAttendee.travelMode) {
                            update.$set[attendeePath + ".travelMode"] = "unspecified";
                            existingAttendee.travelMode = "unspecified";
                        }
                        if (existingAttendee.travelEta) {
                            update.$set[attendeePath + ".travelEta"] = null;
                            existingAttendee.travelEta = null;
                        }
                    }
                    return update;
                }

                update = addAttendeeDelta(update, "organiser", existing.organiser, updated.organiser, startTimeChanged);

                var existingEmails = [];
                existing.attendees.forEach(function (existingAttendee, i) {
                    existingEmails.push(existingAttendee.email);
                });

                var newEmails = [];
                updated.attendees.forEach(function (newAttendee, i) {
                    if (newEmails.indexOf(newAttendee.email) >= 0)
                        throw new RangeError("Same attendee included in meeting twice.");
                  
                    newEmails.push(newAttendee.email);
                });
                
                existing.attendees.forEach(function (existingAttendee, i) {
                    var updatedAttendeeIndex = newEmails.indexOf(existingAttendee.email);
                    var updatedAttendee = (updatedAttendeeIndex >= 0) ? updated.attendees[updatedAttendeeIndex] : null;
                    update = addAttendeeDelta(update, "attendees." + i.toString(), existingAttendee, updatedAttendee, startTimeChanged);
                });

                var newAttendees = updated.attendees.filter(function (value, index) {
                    return existingEmails.indexOf(value.email) < 0;
                });

                if (newAttendees.length > 0) {
                    update.$push = { attendees: { $each: newAttendees } };

                    newAttendees.forEach(function (newAttendee) {
                        existing.attendees.push(newAttendee);
                    });
                }

                return update;
            }

            if (existing.organiser.email !== updated.organiser.email)
                throw new RangeError("The organiser email of the existing and the updated meeting are not the same.");
            if (existing.calUId !== updated.calUId)
                throw new RangeError("The calendar UID of the existing and the updated meeting are not the same.");
            if (existing.calSequence >= updated.calSequence)
                throw new RangeError("The calender sequence of the existing meeting is greater than the updated meeting.");

            var update = {
                $set: {
                    calSequence: updated.calSequence
                }
            };
            existing.calSequence = updated.calSequence;

            var startTimeChanged = (existing.start.getTime() !== updated.start.getTime());
            if (startTimeChanged)
            {
                update.$set["start"] = updated.start;
                existing.start = updated.start;
            }
            if (existing.end.getTime() !== updated.end.getTime())
            {
                update.$set["end"] = updated.end;
                existing.end = updated.end;
            }

            if (existing.subject !== updated.subject) {
                update.$set["subject"] = updated.subject;
                existing.subject = updated.subject;
            }
            if (existing.description !== updated.description) {
                update.$set["description"] = updated.description;
                existing.description = updated.description;
            }
            if (existing.emailId !== updated.emailId) {
                update.$set["emailId"] = updated.emailId;
                existing.emailId = updated.emailId;
            }
            if (existing.location !== updated.location)
            {
                update.$set["location"] = updated.location;
                existing.location = updated.location;

                if (existing.isLocationDetermined !== updated.isLocationDetermined) {
                    update.$set["isLocationDetermined"] = updated.isLocationDetermined;
                    existing.isLocationDetermined = updated.isLocationDetermined;
                }
                if (existing.latitude !== updated.latitude) {
                    update.$set["latitude"] = updated.latitude;
                    existing.latitude = updated.latitude;
                }
                if (existing.longitude !== updated.longitude) {
                    update.$set["longitude"] = updated.longitude;
                    existing.longitude = updated.longitude;
                }
            }
            if (existing.conferenceURL !== updated.conferenceURL) {
                update.$set["conferenceURL"] = updated.conferenceURL;
                existing.conferenceURL = updated.conferenceURL;
            }

            update = addAttendeesDelta(update, existing, updated, startTimeChanged);

            return update;
        }

        var record = sanitise(meeting);
        var updated = sanitise(detail, {
                ignoreNotifiedLate: true,
                ignoreDeleted: true,
                ignoreTravelPlan: true
            });

        if (!utils.isObject(meeting._id))
            throw new RangeError("The existing meeting was not previously stored in database.");
        if (updated._id !== undefined)
            throw new RangeError("The updated meeting already exists in the database.");

        var update = delta(record, updated);

        doUpdateUnchecked(meeting._id, update, callback);
    }

    function updateNotifiedLatePersons(meeting, personsNotifiedLate, callback) {
        function delta(record, persons)
        {
            if (!utils.isArray(persons))
                throw new TypeError("Persons notified late must be an array.");
            var update = {
                $set: {}
            };

            for (var i = 0; i < persons.length; i++) {
                var person = persons[i];
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
        
        doUpdateUnchecked(meeting._id, update, callback);
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
                    isLocationDetermined: true
                }
            };
            record.latitude = coordinates.latitude;
            record.longitude = coordinates.longitude;
            record.isLocationDetermined = true;
            return update;
        }

        var record = sanitise(meeting);
        
        if (!utils.isObject(meeting._id))
            throw new RangeError("Meeting not previously stored in database.");

        var update = delta(record, coordinate);

        doUpdateUnchecked(meeting._id, update, callback);
    }

    function updateTracking(meeting, trackingSettings, callback) {
        function delta(record, settings) {
            if (!utils.isArray(settings))
                throw new TypeError("The tracking settings must be in the form of an array.");
            var update = {
                $set: {}
            };
            var personsAffected = [];

            for (var i = 0; i < settings.length; i++) {
                var trackingSetting = settings[i];

                if (!utils.isObject(trackingSetting))
                    throw new TypeError("A tracking setting must be in the form of an object.");
                var person = trackingSetting.person;
                var shouldTrack = trackingSetting.track;
                if (!utils.isObject(person))
                    throw new TypeError("A tracking setting has an invalid 'person' attribute.");
                if (!utils.isBoolean(shouldTrack))
                    throw new TypeError("A tracking setting has an invalid 'track' attribute.")

                for (var i = 0; i < personsAffected.length; i++)
                {
                    if (personsAffected[i] === person)
                        throw new RangeError("More than one tracking setting exists for a single person.");
                }
                personsAffected.push(person);


                if (record.organiser === person) {
                    if (record.organiser.track !== shouldTrack) {
                        update.$set["organiser.track"] = shouldTrack;
                        record.organiser.track = shouldTrack;
                    }
                }
                else {
                    var attendeeNumber = record.attendees.indexOf(person);
                    if (attendeeNumber >= 0) {
                        var attendee = record.attendees[attendeeNumber];
                        if (attendee.track !== shouldTrack) {
                            update.$set["attendees." + attendeeNumber.toString() + ".track"] = shouldTrack;
                            attendee.track = shouldTrack;
                        }
                    }
                    else {
                        throw new RangeError("A person specified isn't a member of the meeting.");
                    }
                }
            }
            return update;
        }

        var record = sanitise(meeting);
        if (!utils.isObject(meeting._id))
            throw new RangeError("Meeting not previously stored in database.");

        var update = delta(record, trackingSettings);

        doUpdateUnchecked(meeting._id, update, callback);
    }

    function updateTravelPlan(meeting, travelPlan, callback)
    {
        function delta(record, plan) {
            if (!utils.isObject(plan))
                throw new TypeError("The updated travel plan must be an object.");

            var update = {
                $set: {}
            };

            var person = travelPlan.person;
            var travelMode = travelPlan.mode;
            var travelEta = travelPlan.eta;
            if (!utils.isObject(person))
                throw new TypeError("The updated travel plan must have a valid person attribute.");
            if (!validate.travel(travelMode, travelEta))
                throw new TypeError("The updated travel plan has an invalid travel mode and/or eta.");

            function updatePerson(path, person)
            {
                if (person.travelMode !== travelMode)
                {
                    update.$set[path + ".travelMode"] = travelMode;
                    person.travelMode = travelMode;
                }
                if (person.travelEta !== travelEta)
                {
                    update.$set[path + ".travelEta"] = travelEta;
                    person.travelEta = travelEta;
                }
            }

            if (record.organiser === person)
            {
                updatePerson("organiser", record.organiser);
            }
            else
            {
                var attendeeNumber = record.attendees.indexOf(person);
                if (attendeeNumber >= 0) {
                    var attendee = record.attendees[attendeeNumber];
                    updatePerson("attendees." + attendeeNumber.toString(), attendee);
                }
                else 
                    throw new RangeError("A person specified isn't a member of the meeting.");
            }
            return update;
        }

        var record = sanitise(meeting);
        if (!utils.isObject(meeting._id))
            throw new RangeError("Meeting not previously stored in database.");

        var update = delta(record, travelPlan);

        doUpdateUnchecked(meeting._id, update, callback);
    }

    function doUpdateUnchecked(meetingId, update, callback)
    {
        try {
            collection.update({ _id: meetingId }, update, { w: 1 }, function (error, result) {
                try {
                    if (error) {
                        callback(error);
                    }
                    else {
                        callback(null);
                        log.verbose("Meeting update success. ")
                    }
                }
                catch (e) {
                    log.error("Error in callback after meeting update. " + e)
                }
            });
        }
        catch (error) {
            log.error("Error updating meeting. " + error);
            callback(error);
        }
    }

    function get(id, callback)
    {
        var objId;
        if (utils.isString(id)) {

            var validHexID = /^[0-9a-f]{24}$/;
            if (!id.match(validHexID))
                throw new RangeError("Invalid ID.");

            objId = ObjectID.createFromHexString(id);
        }
        else if (id instanceof ObjectID)
            objId = id;
        else
            throw new TypeError("The ID must be a string or an ObjectID.");

        try {
            collection.findOne({ _id: objId }, function (error, document) {
                try
                {
                    callback(error, document);
                }
                catch (e)
                {
                    log.error("Error in callback after #get. " + e)
                }
            });
        }
        catch (error)
        {
            callback(error);
            log.error("Error getting meeting. " + error)
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
                    log.error("Error in callback after #remove. " + e)
                }
            });
        }
        catch (error)
        {
            log.error("Error removing meeting. " + error);
            callback(error);
        }
    }

    function findMeetingsWithin(earliestStart, latestStart, callback) {
        if (!utils.isDate(earliestStart))
            throw new TypeError("Invalid start date provided.");
        if (!utils.isDate(latestStart))
            throw new TypeError("Invalid end date provided.");
        if (!utils.isFunction(callback))
            throw new TypeError("Invalid callback provided.");
        
        try
        {
            collection.find({ start: { $gte: earliestStart, $lte: latestStart } }).toArray(function (error, items) {
                try
                {
                    callback(error, items);
                }
                catch (e)
                {
                    log.error("Error in callback after #findMeetingsWithin. " + e);
                }
            });
        }
        catch (error)
        {
            callback(error);
            log.error("Error finding meetings in time range. " + error)
        }
    }

    function findMeetingsFor(email, callback)
    {
        if (!utils.isString(email) || email.length < "a@a.aa".length)
            throw new TypeError("Invalid email.");
        if (!utils.isFunction(callback))
            throw new TypeError("Invalid callback provided.");

        try
        {
            collection.find({
                $or: [
                    {"organiser.email": email},
                    {
                        "attendees": {
                            $elemMatch: {
                                "email": email,
                                "deleted": {$ne: true}
                            }
                        }
                    }
                ]
            }).toArray(function(error, items) {
                try
                {
                    callback(error, items);
                }
                catch (e)
                {
                    log.error("Error in callback after #findMeetingsFor. " + e);
                }
            });
        }
        catch (error)
        {
            callback(error);
            log.error("Error finding meetings for email. " + error)
        }
    }

    function findMeetingBy(organiserEmail, calUId, callback)
    {
        function deleteExcess(meetings) {
            try {
                for (var i = 1; i < meetings.length; i++)
                    collection.remove({ _id: meetings[i]._id }, { w: 0 });
            }
            catch (e) {
                log.error("Error cleaning up excess meetings." + e);
            }
        }

        if (!utils.isString(organiserEmail) || organiserEmail.length < "a@a.aa".length)
            throw new TypeError("Invalid email.");
        if (!utils.isString(calUId) || calUId.length < 6)
            throw new TypeError("Invalid calendar UID.");
        if (!utils.isFunction(callback))
            throw new TypeError("Invalid callback provided.");

        try
        {
            collection.find({
                $and: [
                    { "organiser.email": organiserEmail },
                    { "calUId": calUId }
                ]
            }).toArray(function (error, items) {
                var success = !error && utils.isArray(items) && items.length > 0;
                if (success && items.length > 1) {
                    log.warn("Excess meetings found for given organiser email & calender UID, cleaning up.");
                    deleteExcess(items);
                }
                
                try
                {
                    if (success)
                        callback(error, items[0]);
                    else
                        callback(error, null);
                }
                catch (e) {
                    log.error("Error in callback after #findMeetingBy. " + e);
                }
            });
        }
        catch (error)
        {
            callback(error);
            log.error("Error finding meeting for organiser email and calendar UID. " + error)
        }
    }

}
exports.create = create;