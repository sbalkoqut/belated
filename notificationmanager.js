var scheduler = require("node-schedule");
var meetingStore = require("./meetingstore");
var locationStore = require("./locationstore");
var distance = require("./distance");
var log = require("./log")("noti");
var notificationSender = require("./notificationsender");

function start(app, debug) {
    var reminderMinutes = [0, 5, 15, 30, 60, 120];
    var mStore = meetingStore.create();
    var lStore = locationStore.create();
    var lastMeetingDate = new Date();
    var notification = notificationSender.create(app);

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
        log("scheduled for meeting organised by " + meeting.organiser.name + ".");
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
        log("Looking for upcoming meetings...");
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
        var allComfortablyOnTime = true;
        var positionReports = [];

        function createPositionReport(person) {
            var position = lStore.getPosition(person.email);
            var report = distance.couldMake(meeting, position);
            report.person = person;

            if (report.late && !person.late) {
                someoneNewLate = true;
                person.late = true;
            }
            if ((!report.comfortable) || report.late) {
                allComfortablyOnTime = false;
            }
            positionReports.push(report);
        }
        log("Checking location of participants " + minutes + " minutes ahead of meeting start.");

        if (meeting.organiser !== undefined) {
            createPositionReport(meeting.organiser);
        }
        
        for (var i = 0; i < meeting.attendees.length; i++) {
            createPositionReport(meeting.attendees[i]);
        }
        
        var sendUpdate = (minutes === 15);
        if (someoneNewLate)
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