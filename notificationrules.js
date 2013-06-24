
var notificationSender = require("./notificationsender");
var log = require("./log")("rule");
var distance = require("./distance");

function create(app, locationStore) {

    var notification = notificationSender(app);
    function runLogic(meeting, minutes) {
        var someoneNewLate = false;
        var allComfortablyOnTime = true;
        var positionReports = [];

        function createPositionReport(person) {
            var position = locationStore.getPosition(person.email);
            var report = distance(meeting, position);
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
    return runLogic;
}
exports = module.exports = create;