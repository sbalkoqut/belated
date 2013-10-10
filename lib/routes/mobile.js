var log = require("../log")(__filename);
var utils = require("../utils");

function create(meetingStore)
{
    function getMeetings(request, response) {
        if (request.method !== "GET") {
            response.send(405); // Method not Allowed
            return;
        }

        var email = request.params.email;

        var validEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!utils.isString(email) || !email.match(validEmail)) {
            log("Error getting meetings: email invalid.");
            response.send(400);
        }
        email = email.toLowerCase();

        meetingStore.findMeetingsFor(email, function (error, items) {
            if (error) {
                log("Unable to query for meetings with particular attendee. " + error);
                response.send(500);
                return;
            }
            response.json(200, items);
        });
    }

    return { getMeetings: getMeetings };
}

exports = module.exports = create;