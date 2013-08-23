var notificationSender = require("./notificationsender");
var log = require("./log")("rule");
var distance = require("./distance");

function create(app, locationStore) {
    var notification = notificationSender(app);

    function runLogic(meeting, minutes, callback) {
        var someoneNewLate = false;
        var allComfortablyOnTime = true;
        var positionReports = [];
        var newLatePersons = [];

        function createPositionReport(person, callback) {
            locationStore.getLastPosition(person.email, function (error, position) {
                if (error)
                {
                    log("Error retreiving location for " + person.email);
                }
                var report = distance(meeting, position);
                report.person = person;

                if (report.late && !person.notifiedLate) {
                    someoneNewLate = true;
                    newLatePersons.push(person);
                }
                if ((!report.comfortable) || report.late) {
                    allComfortablyOnTime = false;
                }
                callback(report);
            });
        }

        log("Checking location of participants " + minutes + " minutes ahead of meeting start.");

        var expectedReports = 0;
        if (meeting.organiser !== undefined) {
            expectedReports++;
            createPositionReport(meeting.organiser, processReport);
        }

        for (var i = 0; i < meeting.attendees.length; i++) {
            expectedReports++;
            createPositionReport(meeting.attendees[i], processReport);
        }


        function processReport(report) {
            positionReports.push(report);
            if (expectedReports === positionReports.length)
                onReportsProcessed();
        }

        function onReportsProcessed() {
            var sendUpdate = (minutes === 15);
            if (someoneNewLate)
                sendUpdate = true;
            if (sendUpdate)
                notification.send(meeting, positionReports);
            callback(newLatePersons);
        }
    }
    return runLogic;
}
exports = module.exports = create;