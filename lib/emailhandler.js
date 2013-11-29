var icalendar = require("icalendar")
  , log = require("./log")("hand");
var inspect = require("util").inspect;

var serviceEmail = require("./config")().email;

function create(meetingCallback) {
    function receivedEmail(mail) {
        try {
            handleEmail(mail);
        }
        catch (error) {
            meetingCallback(error);
        }

        function handleEmail(mail) {
            if (!mail.attachments || mail.attachments.length == 0) {
                meetingCallback(new Error("Message didn't have any attachments."));
                return;
            }
            for (var a = 0; a < mail.attachments.length; a++) {
                var attachment = mail.attachments[a];
                receivedAttachment(attachment);
            }
        }

        function receivedAttachment(attachment) {
            if (attachment.contentType == "text/calendar") {
                handleAttachment(attachment);
            }
        }

        function handleAttachment(attachment) {
            var body = attachment.content.toString("utf8");
            var calendar = icalendar.parse_calendar(body);
            var events = calendar.events();

            for (var i = 0; i < events.length; i++) {
                handleEvent(events[i]);
            }
        }

        function handleEvent(event) {
            var properties = event.properties;
            var location = properties.LOCATION ? properties.LOCATION[0].value : "";
            if (!location)
                location = "";
            var startDate = properties.DTSTART[0].value;
            var endDate = properties.DTEND[0].value;
            var organiser = createAttendeeFrom(properties.ORGANIZER[0]);
            var attendees = createAttendeesFrom(properties.ATTENDEE);
            var subject = properties.SUMMARY ? properties.SUMMARY[0].value : "";
            var description = properties.DESCRIPTION ? properties.DESCRIPTION[0].value.trim() : "";
            var calUId = properties.UID[0].value;
            var calSequence = parseInt(properties.SEQUENCE[0].value);
            var emailId = mail.messageId;
            var conferenceURL = properties["X-GOOGLE-HANGOUT"] ? properties["X-GOOGLE-HANGOUT"][0].value : null;

            var meeting = {
                location: location,
                start: startDate,
                end: endDate,
                organiser: organiser,
                attendees: attendees,
                subject: subject,
                description: description,
                emailId: emailId,
                calUId: calUId,
                calSequence: calSequence,
                conferenceURL: conferenceURL
            };

            var updateMethod = event.calendar.properties.METHOD[0].value.toLowerCase();
            meetingCallback(null, updateMethod, meeting);
        }

        function createAttendeeFrom(contact) {
            var email = contact.value.toLowerCase();
            if (email.length > 7 && email.substr(0, 7) === "mailto:")
                email = email.substr(7, email.length - 7);

            var name = contact.parameters.CN;
            if (name === undefined)
                name = email;

            var track = true;
            var role = contact.parameters.ROLE;
            if (role !== undefined) {
                role = role.toUpperCase();
                if (role === 'OPT-PARTICIPANT' || role === 'NON-PARTICIPANT')
                    track = false;
            }
            return {
                name: name,
                email: email,
                track: track
            };
        }

        function createAttendeesFrom(contacts) {
            var people = [];
            for (var i = 0; i < contacts.length; i++) {
                var person = createAttendeeFrom(contacts[i]);
                if (person.email !== serviceEmail) {
                    people.push(person);
                }
            }
            return people;
        }

    }

    
    return receivedEmail;
}
exports = module.exports = create;