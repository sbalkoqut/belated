var log = require("../log")("routes/meeting");
var utils = require("../utils");
var formatter = require("../formathelper");
var validate = require("../validationhelper")

function create(meetingStore)
{
    function get(request, response)
    {

        if (request.method !== "GET") {
            response.send(405); // Method not Allowed
            return;
        }

        var meetingId = request.params.id;
        meetingStore.get(meetingId, function (error, meeting) {
            if (error)
            {
                log.error("Unable to retreive meeting " + meetingId + ". " + error);
                response.send(500);
                return;
            }
            if (meeting === null)
                response.send(404);
            else {
                meeting = formatter.formatMeeting(meeting);

                var parameters = {
                    id: meetingId,
                    subject: meeting.subject,
                    description: meeting.description,
                    start: meeting.start,
                    end: meeting.end,
                    latitude: meeting.latitude,
                    longitude: meeting.longitude,
                    location: meeting.location,
                    isLocationDetermined: meeting.isLocationDetermined,
                    organiser: meeting.organiser,
                    attendees: meeting.attendees,
                    conferenceURL: meeting.conferenceURL
                };

                if (!parameters.latitude || !parameters.longitude) {
                    parameters.latitude = "null";
                    parameters.longitude = "null";
                }
                response.render("meeting", parameters);
            }
        });
    }

    function setLocation(request, response)
    {
        if (request.method !== "POST") {
            response.send(405); // Method not Allowed
            return;
        }

        var meetingId = request.params.id;
        var latitude = request.body.latitude;
        var longitude = request.body.longitude;
        if (!utils.isString(latitude) || !utils.isString(longitude)) {
            log.warn("Error updating meeting location: No latitude and/or longitude specified.");
            response.send(400);
            return;
        }
        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);

        if (!latitude || latitude > 90 || latitude < -90 ||
            !longitude || longitude > 180 || longitude < -180) {
            log.warn("Error updating meeting location: Latitude and/or longitude out of range.");
            response.send(400);
            return;
        }
        meetingStore.get(meetingId, function (error, meeting) {
            if (error)
            {
                log.error("Unable to retreive meeting for location update. " + error);
                response.send(500);
                return;
            }
            if (meeting === null)
                response.send(404);
            else {
                var coordinates = { latitude: latitude, longitude: longitude };
                meetingStore.updateCoordinate(meeting, coordinates, function (error) {
                    if (error) {
                        log.error("Error updating meeting location: " + error)
                        response.send(500);
                    }
                    else
                        response.send(200);
                });
            }
        });
    }

    function setTracking(request, response)
    {
        if (request.method !== "POST") {
            response.send(405); // Method not Allowed
            return;
        }

        var meetingId = request.params.id;
        var settings = request.body.settings;

        // Validate request parameters.
        if (!utils.isArray(settings))
        {
            log.warn("Error updating tracking settings: Settings not in an array.");
            response.send(400);
            return;
        }

        var emailsAffected = [];
        for (var i = 0; i < settings.length; i++)
        {
            var setting = settings[i];
            if (!utils.isObject(setting) || !validate.email(setting.email)
                || !(setting.track === "true" || setting.track === "false"))
            {
                log.warn("Error updating tracking settings: A setting is invalid.");
                response.send(400);
                return;
            }
            for (var i = 0; i < emailsAffected.length; i++)
                if (emailsAffected[i] === setting.email)
                {
                    log.warn("Error updating tracking settings: More than one tracking setting for one person provided.");
                    response.send(400);
                    return;
                }
            emailsAffected.push(setting.email);
        }

        // Load affected meeting.
        meetingStore.get(meetingId, function (error, meeting) {
            if (error)
            {
                log.error("Unable to retreive meeting for tracking update. " + error);
                response.send(500);
                return;
            }
            if (meeting === null)
                response.send(404);
            else {
                // Prepare meeting update.
                var sanitisedSettings = [];
                for (var i = 0; i < settings.length; i++) {

                    function getPerson(email) {
                        var person = null;
                        if (meeting.organiser.email === email)
                            return meeting.organiser;
                        else {
                            for (var i = 0; i < meeting.attendees.length; i++) {
                                if (meeting.attendees[i].email == email)
                                    return meeting.attendees[i];
                            }
                        }
                    }

                    var setting = settings[i];
                    var person = getPerson(setting.email);
                    if (person === null) {
                        log.warn("Error updating tracking settings: A specified participant does not exist.")
                        response.send(400);
                        return;
                    }

                    var sanitisedSetting = {
                        person: person,
                        track: (setting.track === "true")
                    }
                    sanitisedSettings.push(sanitisedSetting);
                }

                meetingStore.updateTracking(meeting, sanitisedSettings, function (error) {
                    if (error) {
                        log.error("Error updating tracking settings: " + error)
                        response.send(500);
                    }
                    else
                        response.send(200);
                });
            }
        });
    }

    return { get: get, setLocation: setLocation, setTracking: setTracking }
}

exports = module.exports = create;