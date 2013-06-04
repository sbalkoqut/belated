var icalendar = require('icalendar')
  , mapquest = require('mapquest')
  , inspect = require('util').inspect;

function create(meetingCallback) {
    function emailHandler(headers, body) {
        function event(event) {
            function person(contact) {
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
            function people(contacts) {
                var people = [];
                for (var i = 0; i < contacts.length; i++) {
                    people[i] = person(contacts[i]);
                }
                return people;
            }

            var properties = events[i].properties;
            var location = properties.LOCATION[0].value;
            var startDate = properties.DTSTART[0].value;
            var endDate = properties.DTEND[0].value;
            var organiser = person(properties.ORGANIZER[0]);
            var attendees = people(properties.ATTENDEE);
            var subject = properties.SUMMARY[0].value;
            var description = properties.DESCRIPTION[0].value;

            mapquest.geocode(location, function (error, result) {
                if (error || result === undefined || result.latLng === undefined) {
                    meetingCallback(new Error('Could not geocode "' + location + '".'));
                    return;
                }

                var meeting = {
                    latitude: result.latLng.lat,
                    longitude: result.latLng.lng,
                    start: startDate,
                    end: endDate,
                    organiser: organiser,
                    attendees: attendees,
                    subject: subject,
                    description: description
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
            console.log("Calendar parsing error. ");
            meetingCallback(error);
        }
    }
    return emailHandler;
}
exports.create = create;