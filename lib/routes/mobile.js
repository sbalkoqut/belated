var log = require("../log")("routes/mobile");
var utils = require("../utils");
var validate = require("../validationhelper");
var dateutils = require("../dateutils");

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

    function setTravelPlan(request, response)
    {
        if (request.method !== "POST") {
            response.send(405);
            return;
        }

        var meetingId = request.params.id;
        var email = request.body.email;
        var mode = request.body.mode;
        var eta = dateutils.parseDate(request.body.eta);

        if (!validate.email(email)) {
            log("Error updating travel plan: User email is invalid.");
            response.send(400);
            return;
        }
        if (!validate.travel(mode, eta)) {
            console.log(mode);
            console.log(eta);
            log("Error updating travel plan: Travel mode and/or eta is invalid.");
            response.send(400);
            return;
        }

        meetingStore.get(meetingId, function (error, meeting) {
            if (error) {
                log("Unable to query for meeting needed to update travel plan. " + error);
                response.send(500);
                return;
            }
            if (meeting === null) {
                response.send(404);
                return;
            }

            var person = null;
            if (meeting.organiser.email === email)
                person = meeting.organiser;
            else {
                for (var i = 0; i < meeting.attendees.length; i++) {
                    if (meeting.attendees[i].email === email) {
                        person = meeting.attendees[i];
                        break;
                    }
                }
            }

            var travelPlan = {
                person: person,
                mode: mode,
                eta: eta
            };

            meetingStore.updateTravelPlan(meeting, travelPlan, function (error) {
                if (error) {
                    log("Unable to update meeting with new travel plan.");
                    response.send(500);
                    return;
                }
                response.send(200);
            });
        });
    }

    return { getMeetings: getMeetings, setTravelPlan: setTravelPlan };
}



exports = module.exports = create;