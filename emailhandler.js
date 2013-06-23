
var icalendar = require("icalendar")
  , mapquest = require("mapquest")
  , log = require("./log");
var inspect = require("util").inspect;

function create(meetingCallback) {
    function emailHandler(headers, body) {
        function event(event) {
            function toPerson(contact) {
                var email = contact.value;
                if (email.length > 7 && email.substr(0, 7).toLowerCase() == "mailto:")
                    email = email.substr(7, email.length - 7);

                var name = contact.parameters.CN;
                if (name === undefined)
                    name = email;

                return {
                    name: name,
                    email: email
                };
            }
            function toPeople(contacts) {
                var people = [];
                for (var i = 0; i < contacts.length; i++) {
                    var person = toPerson(contacts[i]);
                    if (person.email.toLowerCase() !== "calqut@gmail.com") {
                        people.push(person);
                    }
                }
                return people;
            }

            var properties = events[i].properties;
            var location = properties.LOCATION[0].value;
            var startDate = properties.DTSTART[0].value;
            var endDate = properties.DTEND[0].value;
            var organiser = toPerson(properties.ORGANIZER[0]);
            var attendees = toPeople(properties.ATTENDEE);
            var subject = properties.SUMMARY[0].value;
            var description = properties.DESCRIPTION[0].value.trim();
            var emailId = headers["message-id"];
            mapquest.geocode(location, function (error, result) {
                if (error || result === undefined || result.latLng === undefined) {
                    meetingCallback(new Error('Could not geocode "' + location + '".'));
                    return;
                }

                var meeting = {
                    location: location,
                    latitude: result.latLng.lat,
                    longitude: result.latLng.lng,
                    start: startDate,
                    end: endDate,
                    organiser: organiser,
                    attendees: attendees,
                    subject: subject,
                    description: description,
                    emailId: emailId
                };

                meetingCallback(undefined, meeting);
            });
        }

        try {
            var calendar = icalendar.parse_calendar(body.trim() + "\r\n");
            var events = calendar.events();

            for (var i = 0; i < events.length; i++) {
                event(events[i]);
            }
        }
        catch (error) {
            meetingCallback(error);
        }
    }
    return emailHandler;
}
exports = module.exports = create;