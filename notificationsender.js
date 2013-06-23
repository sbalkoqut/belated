var inspect = require("util").inspect;
var dateFormat = require("dateformat");
var nodemailer = require("nodemailer");
var config = require("./config.json").notificationsender;
var log = require("./log")("smtp");

function create(app) {
    var smtpTransport = nodemailer.createTransport("SMTP", config);

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
        function to() {
            var result = [meeting.organiser.email];
            for (var i = 0; i < meeting.attendees.length; i++) {
                result.push(meeting.attendees[i].email);
            }
            return result;
        }
        var start = dateFormat(meeting.start, "dddd mmmm d, yyyy h:MM tt");

        var end = sameDay(meeting.start, meeting.end) ? dateFormat(meeting.end, "h:MM tt")
                                                      : dateFormat(meeting.end, "dddd mmmm d, yyyy h:MM tt");
        
        var description = meeting.description.replace(/\n/g, '<br>');

        var templateFields = {
            attendees: attendeeReports,
            intro: introduction(),
            subject: meeting.subject,
            description: description,
            start: start,
            end: end,
            latitude: meeting.latitude,
            longitude: meeting.longitude,
            location: meeting.location
        };
        app.render("email", templateFields, function (error, html) {
            if (error) {
                log("Error rendering email: " + error);
                return;
            }

            var mailoptions = {
                to: to(),
                subject: "RE: " + meeting.subject,
                generateTextFromHTML: true,
                html: html,
                inReplyTo: meeting.emailId,
                references: meeting.emailId
            };
            smtpTransport.sendMail(mailoptions, function (error, result) {
                if (error) {
                    log("Error sending email: " + error);
                }
                log("Email sent succesfully: " + result.messageId);
            });
        });
    }
    return { send: send };
}

exports.create = create;