var inspect = require("util").inspect;
var dateFormat = require("dateformat");

function create(app) {

    function send(meeting, attendeeReports) {
        function sameDay(a, b)
        {
            var firstDate = new Date(a.getFullYear(), a.getMonth(), a.getDate());
            var secondDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());

            return (firstDate.getTime() == secondDate.getTime());
        }
        function introduction() {
            var someoneLate = false;
            var allComfortablyOnTime = true;
            for (var i = 0; i < attendeeReports.length; i++) {
                var attendeeReport = attendeeReports[i];
                console.log(inspect(attendeeReport, { depth: 4 }));
                if (attendeeReport.late) {
                    someoneLate = true;
                }
                if (!attendeeReport.comfortable) {
                    allComfortablyOnTime = false;
                }
            }

            var introductoryText = "All attendees look to be arriving on time.";
            if (someoneLate) {
                introductoryText = "Some attendees are stuck in traffic and are running late.";
            }
            else if (!allComfortablyOnTime) {
                introductoryText = "Some attendees may be cutting it close to the meeting start time.";
            }
            return introductoryText;
        }
        console.log(inspect(meeting, { depth: 4 }));

        var start = dateFormat(meeting.start, "dddd mmmm d, yyyy h:MM tt");

        var end;
        if (sameDay(meeting.start, meeting.end))
            end = dateFormat(meeting.end, "h:MM tt");
        else
            end = dateFormat(meeting.end, "dddd mmmm d, yyyy h:MM tt");

        var description = meeting.description.replace(/\n/g, '<br>');

        var subject = meeting.subject + " @ " + start;
        app.mailer.send("email", {
            to: meeting.organiser.email,
            subject: subject,

            intro: introduction(),
            meetingsubject: meeting.subject,
            description: description,
            start: start,
            end: end,
            latitude: meeting.latitude,
            longitude: meeting.longitude,
            location: meeting.location,
            attendees: attendeeReports,
        }, function (error) {
            if (error) {
                console.log("Error sending email: " + error);
                return;
            }
            console.log("Email sent successfully.");
        });
        
    }
    return { send: send };
}

exports.create = create;