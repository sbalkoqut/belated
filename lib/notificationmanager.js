var log = require("./log")("noti");
var geocoder = require("./geocoder");
var scheduler = require("./notificationscheduler");
var notificationLogic = require("./notificationlogic");
var defaultLocation = require("./locationdefaults");
var inspect = require('util').inspect;

function start(app, dataStores) {
    var meetingStore = dataStores.meetings;
    var locationStore = dataStores.locations;
    var notifications = notificationLogic(app, locationStore);
    var schedule = scheduler(meetingStore, notifications);

    function handleMeetingRequest(meeting) {
        function geocodeMeeting(meeting, callback) {
            var location = meeting.location;
            if (!location || location.length === 0)
            {
                log("Blank location specified, skipping geocoding.");
                callback();
                return;
            }

            geocoder(location, function (error, result) {
                if (!error) {
                    log("Meeting geocoded to: " + inspect(result))
                    meeting.isLocationDetermined = true;
                    meeting.latitude = result.latitude;
                    meeting.longitude = result.longitude;
                }
                callback();
            });
        }

        function setDefaultLocation(meeting) {
            meeting.isLocationDetermined = false;

            var location = defaultLocation(meeting.organiser.email);

            meeting.latitude = location.latitude;
            meeting.longitude = location.longitude;
        }

        function updateMeeting(storedMeeting, meeting) {
            meetingStore.updateDetail(storedMeeting, meeting, function (error) {
                if (error)
                    log("Error updating meeting by " + meeting.organiser.name + ": " + error);
                else {
                    log("Updated meeting by " + meeting.organiser.name + " successfully.");
                    onSaved(storedMeeting);
                }
            });
        }

        function insertMeeting(meeting) {
            meetingStore.add(meeting, function (error) {
                if (error)
                    log("Error inserting meeting by " + meeting.organiser.name + ": " + error);
                else {
                    log("Inserted meeting by " + meeting.organiser.name + " successfully.");
                    onSaved(meeting);
                }
            });
        }

        function onSaved(meeting)
        {
            var occursInFuture = schedule(meeting);
           
            if (locationChanged || occursInFuture === false)
            {
                try {
                    notifications.initial(meeting, occursInFuture);
                }
                catch (e) {
                    log("Failed to send initial meeting receipt email." + e.stack);
                }
            }
        }

        var locationChanged = false;
        meetingStore.findMeetingBy(meeting.organiser.email, meeting.calUId, function (error, storedMeeting) {
            if (error)
            {
                log("Error checking if meeting already exists in thedatabase, " + error + ".");
                return;
            }
            if (storedMeeting !== null && storedMeeting.calSequence >= meeting.calSequence)
            {
                log("A more recent version of the meeting already exists in the database, ignoring.");
                return;
            }
            setDefaultLocation(meeting);

            if (storedMeeting !== null && storedMeeting.location === meeting.location) {
                updateMeeting(storedMeeting, meeting);
            }
            else {
                locationChanged = true;
                geocodeMeeting(meeting, function () {
                    if (storedMeeting !== null)
                        updateMeeting(storedMeeting, meeting);
                    else
                        insertMeeting(meeting);

                });
            }
        });
    }

    function handleMeetingCancellation(meeting) {
        meetingStore.findMeetingBy(meeting.organiser.email, meeting.calUId, function (error, storedMeeting) {
            if (error)
            {
                log("Error checking if meeting already exists in thedatabase, " + error + ".");
                return;
            }
            if (storedMeeting === null)
            {
                log("Meeting cancelled, meeting did not exist.");
                return;
            }
            if (storedMeeting.calSequence > meeting.calSequence)
            {
                log("A more recent version of the meeting already exists in the database, ignoring cancellation.");
                return;
            }
            meetingStore.remove(storedMeeting, function (error) {
                if (error)
                {
                    log("Meeting cancellation failed, error removing meeting: " + error);
                }
                else
                {
                    log("Meeting cancelled successfully.");
                }
            });
        });
    }

    function handleLocation(position) {
        locationStore.recordPosition(position);
    }

    return {
        handleMeetingRequest: handleMeetingRequest,
        handleMeetingCancellation: handleMeetingCancellation,
        handleLocation: handleLocation
    }
}
exports = module.exports = start;