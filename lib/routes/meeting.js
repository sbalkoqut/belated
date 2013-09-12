var log = require("../log")(__filename),
    utils = require("../utils");
function create(meetingStore)
{
    function get(request, response)
    {
        var meetingId = request.params.id;
        meetingStore.get(meetingId, function (error, meeting) {
            if (error)
            {
                log("Unable to retreive meeting " + meetingId + ". " + error);
                response.send(500);
                return;
            }
            if (meeting === null)
                response.send(404);
            else {
                var description = meeting.description.replace(/\n/g, '<br>');

                var parameters = {
                    id: meetingId,
                    subject: meeting.subject,
                    description: description,
                    start: meeting.start,
                    end: meeting.end,
                    latitude: meeting.latitude,
                    longitude: meeting.longitude,
                    location: meeting.location,
                    isGeocoded: meeting.isGeocoded, 
                    organiser: meeting.organiser,
                    attendees: meeting.attendees
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
            callback(new Error("Invalid HTTP Method used."));
            return;
        }

        var meetingId = request.params.id;
        var latitude = request.body.latitude;
        var longitude = request.body.longitude;
        if (!utils.isString(latitude) || !utils.isString(longitude))
            log("Error updating meeting location: No latitude and/or longitude specified.");
        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);

        if (!latitude || latitude > 90 || latitude < -90 ||
            !longitude || longitude > 180 || longitude < -180) {
            log("Error updating meeting location: Latitude and/or longitude out of range.");
            response.send(400);
            return;
        }
        meetingStore.get(meetingId, function (error, meeting) {
            if (error)
            {
                log("Unable to retreive meeting for location update. " + error);
                response.send(500);
                return;
            }
            if (meeting === null)
                response.send(404);
            else {
                var coordinates = { latitude: latitude, longitude: longitude };
                meetingStore.updateCoordinate(meeting, coordinates, function (error) {
                    if (error) {
                        log("Error updating meeting location: " + error)
                        response.send(500);
                    }
                    else
                        response.send(200);
                });
            }
        });
    }
    return { get: get, setLocation: setLocation }
}

exports = module.exports = create;