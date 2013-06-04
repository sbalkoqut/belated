
var allMeetings = [];

function add(meeting) {
    if (meeting.end === undefined)
        throw new Error("Meeting doesn't have a valid end date when to purge.");

    // Insert according to meeting end date; meetings ending later at the end.
    var insertIndex = allMeetings.length;
    var insertDate = meeting.end.getUTCDate();
    for (var i = 0; i < allMeetings.length; i++) {
        var currentDate = allMeetings[i].end.getUTCDate();
        if (insertDate < currentDate) {
            insertIndex = i;
            break;
        }
    }
    meetings.splice(insertIndex, 0, meeting);
}

function find(participantEmail) {
    var meetings = [];
    for (var i = 0; i < allMeetings.length; i++) {
        var meeting = allMeetings[i];

        if (meeting.organiser.email === participantEmail) {
            meetings.push(meeting);
        }
        else {
            for (var a = 0; a < meeting.attendees.length; a++) {
                var attendee = meeting.attendees[a];
                if (attendee.email === participantEmail) {
                    meetings.push(meeting);
                    break;
                }
            }
        }
    }
    return meetings;
}

function meetings() {
    return allMeetings;
}

function clean() {
    var now = new Date().getUTCDate();
    var itemsToRemove = 0;
    for (var i = 0; i < allMeetings.length; i++) {
        var meeting = allMeetings[i];
        var endDate = meeting.end.getUTCDate();
        if (now > endDate)
            itemsToRemove += 1;
        else
            break;
    }
    allMeetings.splice(0, itemsToRemove);
}

exports.add = add;
exports.find = find;
exports.meetings = meetings;
exports.clean = clean;