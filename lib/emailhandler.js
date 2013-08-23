var icalendar = require("icalendar")
  , geocoder = require("./geocoder")
  , log = require("./log")("hand");
var inspect = require("util").inspect;

var serviceEmail = require("./config")().email;

function create(meetingCallback) {
    function emailHandler(mail) {
        try {
            if (!mail.attachments || mail.attachments.length == 0) {
                meetingCallback(new Error("Message didn't have any meeting attachments."));
                return;
            }
            for (var a = 0; a < mail.attachments.length; a++) {
                var attachment = mail.attachments[a];
                if (attachment.contentType == "text/calendar") {
                    var body = attachment.content.toString("utf8");
                    var calendar = icalendar.parse_calendar(body);
                    var events = calendar.events();

                    for (var i = 0; i < events.length; i++) {
                        event(events[i]);
                    }
                }
            }
           
        }
        catch (error) {
            meetingCallback(error);
        }

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
                    if (person.email.toLowerCase() !== serviceEmail) {
                        people.push(person);
                    }
                }
                return people;
            }

            var properties = events[i].properties;
            var location = properties.LOCATION ?  properties.LOCATION[0].value : "";
            var startDate = properties.DTSTART[0].value;
            var endDate = properties.DTEND[0].value;
            var organiser = toPerson(properties.ORGANIZER[0]);
            var attendees = toPeople(properties.ATTENDEE);
            var subject = properties.SUMMARY ? properties.SUMMARY[0].value : "";
            var description = properties.DESCRIPTION ? properties.DESCRIPTION[0].value.trim() : "";
            var emailId = mail.messageId;

            if (!location || location.length === 0) {
                meetingCallback(new Error("No location specified in meeting."));
                return;
            }

            geocoder(location, function (error, result) {
                if (error) {
                    meetingCallback(error);
                    return;
                }
                var meeting = {
                    location: location,
                    latitude: result.latitude,
                    longitude: result.longitude,
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
    }
    return emailHandler;
}
exports = module.exports = create;