var assert = require("assert");
var mockery = require("mockery");
var nodemock = require("nodemock");
var inspect = require("util").inspect;
var fs = require("fs");
var log = require("../lib/log")("EHTEST");
describe("emailHandler", function () {

    var allowedModules = ["icalendar", "../lib/emailhandler", "assert", "util", "./icalendar", "./base", "./types", "./rrule", "./timezone", "./event", "./parser", "./log"];

    before(function () {
        mockery.enable();
        mockery.registerAllowables(allowedModules);
        log.enabled = false;
    });

    describe("#create", function () {

        it("should parse emails with valid calender content successfully (Outlook 2010).", function (done) {
            var geocoder = nodemock.mock("geocode").takes("Sydney", function () { })
                .calls(1, [undefined, { latitude: 1.92, longitude: 192.3 }]);
            var configuration = nodemock.mock("get").returns({email: "calqut@gmail.com"});
            mockery.registerMock("./geocoder", geocoder.geocode);
            mockery.registerMock("./config", configuration.get);

            var emailhandler = require("../lib/emailhandler");
            var calendar = fs.readFileSync("test/test-email-outlook-2010.txt");//, "utf8"
            var validMeeting = {
                location: "Sydney",
                isGeocoded: true,
                latitude: 1.92,
                longitude: 192.3,
                start: new Date(Date.UTC(2013, 4, 23, 0, 30, 0, 0)),
                end: new Date(Date.UTC(2013, 4, 23, 1, 0, 0, 0)),
                organiser: {
                    name: "Pierre Curie",
                    email: "pierre.curie@live.com"
                },
                attendees: [{
                    name: "John Smith",
                    email: "johnny.smith@gmail.com"
                }],
                subject: "Meeting Subject",
                description: "Meeting body.",
                emailId: "<BLU501-EAS310DE2D852A184325678890876F1@gbm.phl>"
            };
            var handler = emailhandler(function (error, meeting) {
                assert.strictEqual(error, null, "No error should occur.");
                assert.deepEqual(meeting, validMeeting, "Expected meeting to be parsed correctly.");
                done();
            });
            
            var email = {
                attachments: [{
                    contentType: "text/calendar",
                    content: calendar
                }],
                messageId: "<BLU501-EAS310DE2D852A184325678890876F1@gbm.phl>"
            };
            handler(email);

            mockery.deregisterMock("./geocoder");
            mockery.deregisterMock("./config");
        });
    });

    after(function () {
        mockery.deregisterAllowables(allowedModules);
        mockery.disable();
        log.enabled = true;
    });

});