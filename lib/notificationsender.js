﻿var inspect = require("util").inspect;
var dateFormat = require("dateformat");
var nodemailer = require("nodemailer");
var config = require("./config")();
var log = require("./log")("smtp");
var dateutils = require("./dateutils");
var mapskey = require("./config")().bingkey;

function create(app) {
    var smtpTransport = nodemailer.createTransport("SMTP", config.notificationsender);

    function sendStatus(meeting, attendeeReports) {
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

        var startDate = dateutils.toLocalTime(meeting.start);
        var endDate = dateutils.toLocalTime(meeting.end);

        var start = dateFormat(startDate, "dddd mmmm d, yyyy h:MM tt");

        var end = dateutils.isSameDay(startDate, endDate) ? dateFormat(endDate, "h:MM tt")
                                                      : dateFormat(endDate, "dddd mmmm d, yyyy h:MM tt");
        
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
        app.render("statusemail", templateFields, function (error, html) {
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
                    log("Error sending status email: " + error);
                }
                log("Email sent succesfully: " + result.messageId);
            });
        });
    }

    function sendInitial(meeting, occursInFuture)
    {
        var people = [meeting.organiser];
        for (var i = 0; i < meeting.attendees.length; i++)
            people.push(meeting.attendees[i]);

        var link = "http://" + config.sitedomain + "/meeting/" + meeting._id.toString();
        var description = meeting.description.replace(/\n/g, '<br>');



        var startDate = dateutils.toLocalTime(meeting.start);
        var endDate = dateutils.toLocalTime(meeting.end);

        var start = dateFormat(startDate, "dddd mmmm d, yyyy h:MM tt");

        var end = dateutils.isSameDay(startDate, endDate) ? dateFormat(endDate, "h:MM tt")
                                                      : dateFormat(endDate, "dddd mmmm d, yyyy h:MM tt");
        var templateFields = {
            people: people,
            subject: meeting.subject,
            description: description,
            start: start,
            end: end,
            isGeocoded: meeting.isGeocoded,
            location: meeting.location,
            latitude: meeting.latitude,
            longitude: meeting.longitude,
            link: link,
            occursInFuture: occursInFuture,
            mapskey: mapskey
        };
        app.render("initialemail", templateFields, function (error, html) {
            if (error) {
                log("Error rendering initial email: " + error);
                return;
            }

            var mailoptions = {
                to: meeting.organiser.email,
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

    return { sendStatus: sendStatus, sendInitial: sendInitial };
}

exports = module.exports = create;