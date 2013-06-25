var log = require("./log")("msto");

function create() {
    var allMeetings = [];

    function add(meeting) {
        if (meeting.start === undefined || meeting.end === undefined)
            throw new Error("Meeting doesn't have a valid start or end date.");

        // Insert according to meeting end date; meetings ending later at the end.
        var insertIndex = allMeetings.length;
        var insertTime = meeting.start.getTime();
        for (var i = 0; i < allMeetings.length; i++) {
            var currentTime = allMeetings[i].start.getTime();
            if (insertTime < currentTime) {
                insertIndex = i;
                break;
            }
        }
        allMeetings.splice(insertIndex, 0, meeting);
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

    function getMeetingsWithin(earliestStart, latestStart) {
        var earliest = earliestStart.getTime();
        var latest = latestStart.getTime();
        var result = [];
        for (var i = 0; i < allMeetings.length; i++) {
            var currentMeeting = allMeetings[i];
            var currentStart = currentMeeting.start.getTime();
            if (currentStart > latest) {
                return result;
            }
            else if (currentStart >= earliest) {
                result.push(currentMeeting);
            }

        }
        return result;
    }

    function remove(meeting) {
        for (var i = 0; i < allMeetings.length; i++) {
            var currentMeeting = allMeetings[i];
            if (currentMeeting == meeting) {
                allMeetings.splice(i, 1);
                return true;
            }
        }
        log("A meeting removal failed!");
        return false;
    }

    return {
        add: add,
        getMeetingsWithin: getMeetingsWithin,
        remove: remove
    };
}
exports = module.exports = create;