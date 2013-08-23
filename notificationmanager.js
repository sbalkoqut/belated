var scheduler = require("node-schedule");
//var meetingStore = require("./persistantmeetingstore");
//var locationStore = require("./locationstore");
var log = require("./log")("noti");
var notificationRules = require("./notificationrules");
var persistancy = require("./persistancy");

function start(app, callback) {
    var reminderMinutes = [0, 5, 15, 30, 60, 120];
    var mStore;
    var lStore;
    var lastMeetingDate = new Date(1900, 0);
    var notificationLogic;

    function scheduleNotifications(meeting) {
        var now = Date.now();
        var scheduled = false;

        for (var i = 0; i < reminderMinutes.length; i++) {
            var reminderTime = meeting.start.getTime() - (reminderMinutes[i] * 60 * 1000);
            if (reminderTime <= now)
                continue;

            (function (meeting, minutes) {
                var scheduledDate = new Date(reminderTime);
                scheduledDate.time = reminderTime; // For unit testing.

                scheduler.scheduleJob(scheduledDate, function () {
                    checkMeeting(meeting, minutes);
                });
            })(meeting, reminderMinutes[i]);
            scheduled = true;
        }
        if (!scheduled) {
            log("Could not schedule meeting organised by " + meeting.organiser.name + " (already occurred).");
            mStore.remove(meeting, function (error) {
                if (error) {
                    log("Failed to remove meeting " + meeting._id + ": " + error);
                }
            });
        }
        else {
            log("Scheduled for meeting organised by " + meeting.organiser.name + ".");

        }
    }

    function checkMeeting(meeting, minutesBeforeStart)
    {
        notificationLogic(meeting, minutesBeforeStart, function (newPersonsLate) { 

            if (minutesBeforeStart === 0) {
                log("Removing a meeting that just started.");
                mStore.remove(meeting, function (error) {
                    if (error) {
                        log("Failed to remove meeting " + meeting._id + ": " + error);
                    }
                });
            }
            else if (newPersonsLate.length > 0)
            {
                log("Persisting late attendees for meeting organised by " + meeting.organiser.name + ".");
                mStore.updateNotifiedLatePersons(meeting, newPersonsLate, function (error) {
                    if (error) {
                        log("");
                    }
                });
            }
        });
    }

    function handleMeeting(meeting) {
        mStore.add(meeting, function (error) {
            if (error) {
                log("Failed to store meeting in db. Meeting dropped. " + error);
                return;
            }

            if (meeting.start.getTime() <= lastMeetingDate.getTime()) {
                // Meeting received late. Forward for immediate processing.
                scheduleNotifications(meeting);
            }
        });
    }

    function handleLocation(position) {
        lStore.recordPosition(position);
    }

    function process() {
        log("Looking for upcoming meetings...");
        var soon = new Date(Date.now() + 3 * 60 * 60 * 1000);

        mStore.findMeetingsWithin(lastMeetingDate, soon, function (error, meetings) {
            if (error) {
                log("Failed to retreive meetings. " + error);
                return;
            }

            lastMeetingDate = soon;
            for (var i = 0; i < meetings.length; i++) {
                scheduleNotifications(meetings[i]);
            }
        });
    }
    persistancy.connect(function (error, dataStores) {
        if (error) {
            log("Failed to connect to persistency.")
            callback(error);
        }

        mStore = dataStores.meetings;
        lStore = dataStores.locations;

        notificationLogic = notificationRules(app, lStore);

        var rule = new scheduler.RecurrenceRule();
        rule.minute = [1, 31];

        scheduler.scheduleJob(rule, process);
        process();

        callback(null, { handleMeeting: handleMeeting, handleLocation: handleLocation });
    });
}

exports = module.exports = start;