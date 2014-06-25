var notificationSender = require("./notificationsender");
var log = require("./log")("logi");
var rules = require("./notificationrules");

function create(app, locationStore) {
    var notification = notificationSender(app);

    function statusUpdate(meeting, minutes, callback) {
        var someoneNewLate = false;
        var allComfortablyOnTime = true;
        var positionReports = [];
        var newLatePersons = [];

        function createReportFromPosition(person)
        {
            locationStore.getLastPosition(person.email, function (error, position) {
                if (error) {
                    log.warn("Error retreiving location for " + person.email);
                }
                var report = rules.evaluateForPosition(meeting, position);
                report.person = person;

                addReport(report);
            });
        }

        function createReportFromTravelPlan(person)
        {
            var report = rules.evaluateForTravelPlan(meeting, person);
            report.person = person;

            addReport(report);
        }

        function createReport(person) {
            if (person.travelMode === "unspecified")
                createReportFromPosition(person);
            else
                createReportFromTravelPlan(person);
        }

        log.verbose("Checking location of participants " + minutes + " minutes ahead of meeting start.");

        var expectedReports = 0;
        if (meeting.organiser !== undefined && meeting.organiser.track !== false) {
            expectedReports++;
        }
        meeting.attendees.forEach(function (attendee) {
            if (attendee.deleted !== true && attendee.track !== false)
                expectedReports++;
        });

        if (meeting.organiser !== undefined && meeting.organiser.track !== false) {
            createReport(meeting.organiser);
        }
        meeting.attendees.forEach(function (attendee) {
            if (attendee.deleted !== true && attendee.track !== false)
                createReport(attendee);
        });

        function processReport(report) {
            if (report.late && !report.person.notifiedLate) {
                someoneNewLate = true;
                newLatePersons.push(report.person);
            }
            if ((!report.comfortable) || report.late) {
                allComfortablyOnTime = false;
            }
        }

        function addReport(report) {
            processReport(report);
            positionReports.push(report);
            if (expectedReports === positionReports.length)
                onReportsProcessed();
        }

        function onReportsProcessed() {
            var sendUpdate = (minutes === 15);
            if (someoneNewLate)
                sendUpdate = true;
            if (sendUpdate)
                notification.sendStatus(meeting, positionReports);
            callback(newLatePersons);
        }
    }

    function initial(meeting, occursInFuture)
    {
        notification.sendInitial(meeting, occursInFuture);
    }

    return { statusUpdate: statusUpdate, initial: initial };
}
exports = module.exports = create;