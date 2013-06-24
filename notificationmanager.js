var scheduler = require("node-schedule");
var meetingStore = require("./meetingstore");
var locationStore = require("./locationstore");
var log = require("./log")("noti");
var notificationRules = require("./notificationrules");

function start(app, debug) {
    var reminderMinutes = [0, 5, 15, 30, 60, 120];
    var mStore = meetingStore();
    var lStore = locationStore();
    var lastMeetingDate = new Date();
    var notificationLogic = notificationRules(app, lStore);

    function scheduleNotifications(meeting) {
        var now = Date.now();
        for (var i = 0; i < reminderMinutes.length; i++) {
            var reminderTime = meeting.start.getTime() - (reminderMinutes[i] * 60 * 1000);
            if (reminderTime <= now)
                continue;

            (function (meeting, minutes) {
                var scheduledDate = new Date(reminderTime);
                scheduledDate.time = reminderTime; // For unit testing.

                scheduler.scheduleJob(scheduledDate, function () {
                    notificationLogic(meeting, minutes);
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
        var soon = new Date(Date.now() + 3 * 60 * 60 * 1000);

        var meetings = mStore.getMeetingsWithin(lastMeetingDate, soon);
        lastMeetingDate = soon;
        for (var i = 0; i < meetings.length; i++) {
            scheduleNotifications(meetings[i]);
        }
    }

    

    var rule = new scheduler.RecurrenceRule();
    rule.minute = [1, 31 ];

    scheduler.scheduleJob(rule, process);
    process();

    return { handleMeeting: handleMeeting, handleLocation: handleLocation };
}

exports = module.exports = start;