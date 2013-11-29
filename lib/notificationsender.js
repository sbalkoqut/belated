var inspect = require("util").inspect;
var formatter = require("./formathelper");
var nodemailer = require("nodemailer");
var config = require("./config")();
var log = require("./log")("smtp");
var mapskey = require("./config")().bingkey;

function create(app) {
    var smtpTransport = nodemailer.createTransport("SMTP", config.notificationsender);

    function sendStatus(meeting, attendeeReports) {

        prepareAndSend();

        function prepareAndSend() {
            var templateFields = formatter.formatMeeting(meeting);

            templateFields.attendees = attendeeReports;
            templateFields.intro = introduction();

            app.render("statusemail", templateFields, function (error, html) {
                if (error) 
                    log("Error rendering email: " + error);
                else
                    send(html);
            });
        }

        function send(html)
        {
            var mailoptions = {
                to: to(),
                subject: "RE: " + meeting.subject,
                generateTextFromHTML: true,
                html: html,
                inReplyTo: meeting.emailId,
                references: meeting.emailId
            };
            smtpTransport.sendMail(mailoptions, function (error, result) {
                if (error) 
                    log("Error sending status email: " + error);
                else
                    log("Email sent succesfully: " + result.messageId);
            });
        }

        function introduction() {
            var someoneLate = false;
            var allComfortablyOnTime = true;
            attendeeReports.forEach(function (report) {
                if (report.late) 
                    someoneLate = true;
                if (!report.comfortable)
                    allComfortablyOnTime = false;
            });

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
            var recipients = [];

            recipients.push(meeting.organiser.email);
            meeting.attendees.forEach(function (attendee) {
                if (attendee.deleted !== true) 
                    recipients.push(attendee.email);
            });
            return recipients;
        }
    }

    function sendInitial(meeting, occursInFuture)
    {
        prepareAndSend();

        function prepareAndSend() {
            var link = "http://" + config.sitedomain + "/meeting/" + meeting._id.toString();

            var templateFields = formatter.formatMeeting(meeting);
            templateFields.people = people();
            templateFields.link = link;
            templateFields.occursInFuture = occursInFuture;
            templateFields.mapskey = mapskey;

            app.render("initialemail", templateFields, function (error, html) {
                if (error)
                    log("Error rendering initial email: " + error);
                else
                    send(html);
            });
        }

        function send(html)
        {
            var mailoptions = {
                to: meeting.organiser.email,
                subject: "RE: " + meeting.subject,
                generateTextFromHTML: true,
                html: html,
                inReplyTo: meeting.emailId,
                references: meeting.emailId
            };
            smtpTransport.sendMail(mailoptions, function (error, result) {
                if (error) 
                    log("Error sending email: " + error);
                else
                    log("Email sent succesfully: " + result.messageId);
            });
        }

        function people()
        {
            var people = [];
            people.push(meeting.organiser);
            meeting.attendees.forEach(function (person) {
                if (person.deleted !== true)
                    people.push(person);
            });
            return people;
        }
    }

    return { sendStatus: sendStatus, sendInitial: sendInitial };
}

exports = module.exports = create;