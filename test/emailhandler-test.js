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
            //var geocoder = nodemock.mock("geocode").takes("Sydney", function () { })
            //    .calls(1, [undefined, { latitude: 1.92, longitude: 192.3 }]);
            var configuration = nodemock.mock("get").returns({email: "calqut@gmail.com"});
            //mockery.registerMock("./geocoder", geocoder.geocode);
            mockery.registerMock("./config", configuration.get);

            var emailhandler = require("../lib/emailhandler");
            var calendar = fs.readFileSync("test/test-email-outlook-2010.txt");//, "utf8"
            var validMeeting = {
                location: "Sydney",
                start: new Date(Date.UTC(2013, 4, 23, 0, 30, 0, 0)),
                end: new Date(Date.UTC(2013, 4, 23, 1, 0, 0, 0)),
                organiser: {
                    name: "Pierre Curie",
                    email: "pierre.curie@live.com",
                    track: true
                },
                attendees: [{
                    name: "John Smith",
                    email: "johnny.smith@gmail.com",
                    track: true
                }],
                subject: "Meeting Subject",
                description: "Meeting body.",
                emailId: "<BLU501-EAS310DE2D852A184325678890876F1@gbm.phl>",
                calUId: "040000008200E00074C5B7101A82E00800000000D09C51E09D57CE01000000000000000010000000E5D02B2E0D031B4A80BB9421D37A70E8",
                calSequence: 1
            };
            var handler = emailhandler(function (error, method, meeting) {
                assert.strictEqual(error, null, "No error should occur.");
                assert.deepEqual(method, "request", "Expected method to be detected correctly.");
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