var scheduler = require("node-schedule");
var meetingStore = require("./meetingstore");
var locationStore = require("./locationstore");
var distance = require("./distance");
var notification = require("./notificationsender");

function start() {
    var reminderMinutes = [0, 5, 10, 30, 60, 120];
    var mStore = meetingStore.create();
    var lStore = locationStore.create();
    var lastMeetingDate = new Date();

    function scheduleNotifications(meeting) {
        var now = Date.now();
        for (var i = 0; i < reminderMinutes.length; i++) {
            var reminderTime = meeting.start.getTime() - (reminderMinutes[i] * 60 * 1000);
            if (reminderTime <= now)
                continue;

            (function (meeting, minutes) {
                scheduler.scheduleJob(new Date(reminderTime), function () {
                    check(meeting, minutes);
                });
            })(meeting, reminderMinutes[i]);
        }
        console.log("[NOTIFICATIONS] scheduled for meeting organised by " + meeting.organiser.name + ".");
    }

    function handleMeeting(meeting) {
        mStore.add(meeting);
        
        if (meeting.start.getTime() <= lastMeetingDate.getTime()) {
            // Meeting received late. Forward for immediate processing.
            scheduleNotifications(meeting);
        }
    }

    function handleLocation(position) {
        lStore.setPosition(position);
    }

    function process() {
        console.log("[NOTIFICATIONS] Looking for upcoming meetings...");
        var soon = new Date();
        soon.setHours(soon.getHours() + 3);

        var meetings = mStore.getMeetingsWithin(lastMeetingDate, soon);
        lastMeetingDate = soon;
        for (var i = 0; i < meetings.length; i++) {
            scheduleNotifications(meetings[i]);
        }
    }

    function check(meeting, minutes) {
        var someoneNewLate = false;
        var someoneCloseOrLate = false;
        var positionReports = [];

        function createPositionReport(person) {
            var position = lStore.getPosition(person.email);
            var report = distance.couldMake(meeting, position);

            if (report.late && !person.late) {
                someoneNewLate = true;
                person.late = true;
            }
            if (report.close || report.late) {
                someoneCloseOrLate = true;
            }
            positionReports.push(report);
        }
        console.log("[NOTIFICATIONS] Checking location of participants " + minutes + " minutes ahead of meeting start.");

        if (meeting.organiser !== undefined) {
            createPositionReport(meeting.organiser);
        }
        
        for (var i = 0; i < meeting.attendees.length; i++) {
            createPositionReport(meeting.attendees[i]);
        }

        var sendUpdate = (minutes === 10);
        if (someoneNewLate)
            sendUpdate = true;
        else if (someoneCloseOrLate && minutes < 10)
            sendUpdate = true;
        if (sendUpdate)
            notification.send(meeting, positionReports);
    }

    var rule = new scheduler.RecurrenceRule();
    rule.minute = [1, 31 ];

    scheduler.scheduleJob(rule, process);
    process();

    return { handleMeeting: handleMeeting, handleLocation: handleLocation };
}

exports.start = start;