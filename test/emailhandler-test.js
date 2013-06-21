var assert = require("assert");
var mockery = require("mockery");
var nodemock = require("nodemock");
var inspect = require("util").inspect;
var fs = require("fs");

describe("emailHandler", function () {

    var allowedModules = ["icalendar", "../emailhandler", "assert", "util", "./icalendar", "./base", "./types", "./rrule", "./timezone", "./event", "./parser"];

    before(function () {
        mockery.enable();
        mockery.registerAllowables(allowedModules);
    });

    describe("#create", function () {

        it("should parse emails with valid calender content successfully (Outlook 2010).", function (done) {
            var mapquest = nodemock.mock("geocode");
            mapquest.takes("Sydney", function () { })
                .calls(1, [undefined, { latLng: { lat: 1.92, lng: 192.3 } }]);

            mockery.registerMock("mapquest", mapquest);

            var emailhandler = require("../emailhandler");
            var email = fs.readFileSync("test/test-email-outlook-2010.txt", "utf8");
            var validMeeting = {
                location: "Sydney",
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
                description: "Meeting body."
            };
            var handler = emailhandler.create(function (error, meeting) {
                assert.strictEqual(error, undefined, "No error should occur.");
                assert.deepEqual(meeting, validMeeting, "Expected meeting to be parsed correctly.");
                done();
            });
            
            handler(undefined, email);

            mockery.deregisterMock("mapquest");
        });
    });

    after(function () {
        mockery.deregisterAllowables(allowedModules);
        mockery.disable();
    });

});