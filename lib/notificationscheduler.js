var scheduler = require("node-schedule");
var log = require("./log")("shed");

function start(mStore, notificationLogic) {
    var reminderMinutes = [0, 5, 15, 30, 60, 120];
    var lastMeetingDate = new Date(1900, 0);

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
            log("Didn't schedule meeting organised by " + meeting.organiser.name + ", already occurred.");
            mStore.remove(meeting, function (error) {
                if (error) {
                    log("Failed to remove meeting " + meeting._id + ": " + error);
                }
            });
            return false;
        }
        else {
            log("Scheduled for meeting organised by " + meeting.organiser.name + ".");
            return true;
        }
    }

    function checkMeeting(meeting, minutesBeforeStart) {
        mStore.get(meeting._id, function (error, currentMeeting) {
            if (error)
            {
                log("Unable to get retreive meeting for notifications." + error);
                return;
            }
            if (!currentMeeting || (meeting.calSequence !== currentMeeting.calSequence))
            {
                log("Meeting updated since meeting check scheduled. Skipping.");
                return;
            }
            notificationLogic.statusUpdate(meeting, minutesBeforeStart, function (newPersonsLate) {

                if (minutesBeforeStart === 0) {
                    log("Removing a meeting that just started.");
                    mStore.remove(meeting, function (error) {
                        if (error) {
                            log("Failed to remove meeting " + meeting._id + ": " + error);
                        }
                    });
                }
                else if (newPersonsLate.length > 0) {
                    log("Persisting late attendees for meeting organised by " + meeting.organiser.name + ".");
                    mStore.updateNotifiedLatePersons(meeting, newPersonsLate, function (error) {
                        if (error) {
                            log("");
                        }
                    });
                }
            });
        });
    }

    function schedule(meeting) {
        var occursInFuture = true;
        if (meeting.start.getTime() <= lastMeetingDate.getTime()) {
            // Meeting received late. Forward for immediate processing.
            occursInFuture = scheduleNotifications(meeting);
        }
        return occursInFuture;
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

    var rule = new scheduler.RecurrenceRule();
    rule.minute = [1, 31];

    scheduler.scheduleJob(rule, process);
    process();

    return schedule;
}

exports = module.exports = start;