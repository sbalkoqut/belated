var dateutils = require("./dateutils");
var dateFormat = require("dateformat");

function formatDescription(meeting) {
    meeting.description = meeting.description.replace(/\n/g, '<br>');
}

function formatDates(meeting) {
    function formatEta(attendee) {
        if (attendee.travelEta) {
            var estimatedTimeOfArrival = dateutils.toLocalTime(attendee.travelEta);
            attendee.travelEta = dateFormat(estimatedTimeOfArrival, "h:MM tt");
        }
    }

    var startDate = dateutils.toLocalTime(meeting.start);
    var endDate = dateutils.toLocalTime(meeting.end);

    meeting.start = dateFormat(startDate, "dddd mmmm d, yyyy h:MM tt");
    meeting.end = dateutils.isSameDay(startDate, endDate) ? dateFormat(endDate, "h:MM tt")
                                                  : dateFormat(endDate, "dddd mmmm d, yyyy h:MM tt");

    formatEta(meeting.organiser);
    for (var i = 0; i < meeting.attendees.length; i++)
        formatEta(meeting.attendees[i]);
}

function clone(object) {
    var result = {};
    for (var key in object) {
        result[key] = object[key];
    }
    return result;
}

function cloneMeeting(meeting)
{
    var result = clone(meeting);
    result.attendees = [];
    for (var i = 0; i < meeting.attendees.length; i++)
        result.attendees.push(clone(meeting.attendees[i]));

    return result;
}

function formatMeeting(meeting)
{
    var result = cloneMeeting(meeting);

    formatDescription(result);
    formatDates(result);

    return result;
}

exports.formatMeeting = formatMeeting;