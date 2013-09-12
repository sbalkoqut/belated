var assert = require("assert");
var mockery = require("mockery");
var nodemock = require("nodemock");

describe("notificationmanager", function () {
    
    var app;
    var locationStore;
    var meetingStore;
    var rulesModule, rules;
    var scheduler;
  
    var meetingsWithin;

    var allowedModules = ["./log", "../lib/log", "../lib/notificationmanager"];
    var minute = 60 * 1000;

    beforeEach(function () {
        app = { "Mock instance of Type": "App" };

        scheduler = nodemock.mock("RecurrenceRule").returns({ "Mock instance of Type": "RecurrenceRule" });
        scheduler.mock("scheduleJob").takes({ "Mock instance of Type": "RecurrenceRule", minute: [1, 31] }, function () { });
    });

    function beginTest(callback) {
        function extendMeetingStore() {
            meetingStore = meetingStore || { };

            meetingStore.findMeetingsWithin = function (start, end, callback) {
                if (!meetingStore.findMeetingsWithin.end)
                    meetingStore.findMeetingsWithin.end = new Date(1900, 0);
                var expectedStart = meetingStore.findMeetingsWithin.end;
                var expectedEnd = Date.now() + 3 * 60 * minute;

                assert(start.getTime() <= expectedStart, "#findMeetingsWithin was not called with a correct start parameter.");
                assert(start.getTime() > (expectedStart - 100), "#findMeetingsWithin was not called with a correct start parameter.");
                assert(end.getTime() <= expectedEnd, "#findMeetingsWithin was not called with a correct end parameter.");
                assert(end.getTime() > (expectedEnd - 100), "#findMeetingsWithin was not called with a correct end parameter.");

                meetingStore.findMeetingsWithin.end = end.getTime();
                meetingStore.findMeetingsWithin.start = start.getTime();
                meetingStore.findMeetingsWithin.count++;
                
                if (meetingStore.findMeetingsWithin.count == 2)
                    callback(null, meetingsWithin);
                else
                    callback(null, []);
            }
            meetingStore.findMeetingsWithin.count = 0;
        }
        meetingsWithin = meetingsWithin || [];

        extendMeetingStore();

        mockery.registerAllowables(allowedModules);

        rulesModule = nodemock.mock("create").takes(app, locationStore).returns(rules);

        mockery.registerMock("./notificationrules", rulesModule.create);
        mockery.registerMock("node-schedule", scheduler);
        
        mockery.enable({ useCleanCache: true });

        nm = require("../lib/notificationmanager")(app, { meetings: meetingStore, locations: locationStore });
        callback();
    }

    function endTest() {
        rulesModule.assertThrows();
        scheduler.assertThrows();
    }

    afterEach(function () {
        rules = undefined;
        locationStore = undefined;
        meetingStore = undefined;
        rulesModule = undefined;
        meetingsWithin = undefined;
        mockery.deregisterAll();
        mockery.disable();
    });


    it("should store location updates", function (done) {
        var position = {
            latitude: -52.821732,
            longitude: -23.1232,
            email: "john.smith@gmail.com",
            lastUpdate: new Date(2013, 6, 13, 10, 17, 39)
        };
        locationStore = nodemock.mock("recordPosition").takes(position);

        beginTest(function () {

            nm.handleLocation(position);

            endTest();
            locationStore.assert();
            assert.strictEqual(meetingStore.findMeetingsWithin.count, 1, "#findMeetingsWithin() should only be called once at the start.");
            done();
        });
    });

    it("should just store meetings more than 3 hours away", function (done) {
        var meeting = {
            location: "Brisbane, Australia",
            latitude: 1.92,
            longitude: 192.3,
            organiser: {
                name: "Pierre Curie",
                email: "pierre.curie@live.com"
            },
            attendees: [{
                name: "John Smith",
                email: "johnny.smith@gmail.com"
            }],
            subject: "Meeting Subject",
            description: "Meeting body.\n",
            emailId: "<BLU401-EAS404DE843EABFACD74383473288F1@phx.gbl>"
        };
        meetingStore = nodemock.mock("add").takes(meeting, function () { }).calls(1, null);

        var rulesMock = nodemock.mock("initial").takes(meeting, true);

        rules = rulesMock;
        beginTest(function () {

            meeting.start = new Date(meetingStore.findMeetingsWithin.end + 1);
            meeting.end = new Date(meetingStore.findMeetingsWithin.end + 1001);

            nm.handleMeeting(meeting);

            endTest();
            rulesMock.assertThrows();
            meetingStore.assertThrows();
            assert.strictEqual(meetingStore.findMeetingsWithin.count, 1, "#findMeetingsWithin() should only be called once at the start.");

            done();
        });
    });

    it("should schedule (and store) meetings within 3 hours away", function (done) {
        var startTime = Date.now() + 45 * minute;
        var meeting = {
            location: "Perth, Australia",
            latitude: -1.92,
            longitude: 192.3,
            organiser: {
                name: "Daniel Baker",
                email: "daniel.baker@live.com"
            },
            attendees: [{
                name: "Fred Smith",
                email: "fred.smith@gmail.com"
            }],
            start: new Date(startTime),
            end: new Date(startTime + 30 * 60 * 1000),
            subject: "Sales Meeting",
            description: "There were no sales.\n",
            emailId: "<BLU401-EAS404DE843EABFACD74383473288F2@phx.gbl>"
        };
        meetingStore = nodemock.mock("add").takes(meeting, function () { }).calls(1, null);
        meetingStore = meetingStore.mock("remove").takes(meeting, function () { }).calls(1, null);

        var rulesMock = nodemock.mock("initial").takes(meeting, true);

        var minutesBefore = [0, 5, 15, 30];

        for (var i = 0; i < minutesBefore.length; i++) {
            var latePerson = { "Sample late person" : minutesBefore[i] };

            var scheduleDate = new Date(startTime - (minutesBefore[i] * minute));
            scheduleDate.time = scheduleDate.getTime();
            scheduler = scheduler.mock("scheduleJob").takes(scheduleDate, function () { }).calls(1);
            rulesMock = rulesMock.mock("statusUpdate").takes(meeting, minutesBefore[i], function () { }).calls(2, [[latePerson]]);
            if (minutesBefore[i] > 0) {
                meetingStore = meetingStore.mock("updateNotifiedLatePersons").takes(meeting, [latePerson], function () { }).calls(2, null);
            }
        }

        rules = rulesMock;


        beginTest(function () {

            nm.handleMeeting(meeting);

            endTest();
            rulesMock.assertThrows();
            meetingStore.assertThrows();
            assert.strictEqual(meetingStore.findMeetingsWithin.count, 1, "#findMeetingsWithin() should only be called once at the start.");
            done();
        });
    });

    it("should periodically retreive new meetings and schedule them", function (done) {

        scheduler.calls(1);

        var startTime = Date.now() + 180 * minute;
        meetingsWithin = [
            {
                subject: "First meeting.",
                start: new Date(startTime),
                end: new Date(startTime + 1000),
                organiser: { name: "Johnny Smith", email: "johnny.smith@gmail.com" }
            },
            {
                subject: "Second meeting.",
                start: new Date(startTime),
                end: new Date(startTime + 1000),
                organiser: { name: "Peter Heymann", email: "peter.heymann@hotmail.com" }
            },
            {
                subject: "Third meeting.",
                start: new Date(startTime + 1),
                end: new Date(startTime + 1001),
                organiser: { name: "Joseph Apple", email: "joseph.apple@gmail.com" }
            }];

        var rulesMock = nodemock;
        meetingStore = nodemock;

        var minutesBefore = [0, 5, 15, 30, 60, 120];
        for (var m = 0; m < meetingsWithin.length; m++) {
            var meeting = meetingsWithin[m];
            for (var i = 0; i < minutesBefore.length; i++) {

                var latePerson = { "Sample late person" : minutesBefore[i] };

                var scheduleDate = new Date(meeting.start.getTime() - (minutesBefore[i] * minute));
                scheduleDate.time = scheduleDate.getTime();
                scheduler = scheduler.mock("scheduleJob").takes(scheduleDate, function () { }).calls(1);
                rulesMock = rulesMock.mock("statusUpdate").takes(meeting, minutesBefore[i], function () { }).calls(2, [[latePerson]]);

                if (minutesBefore[i] > 0) {
                    meetingStore = meetingStore.mock("updateNotifiedLatePersons").takes(meeting, [latePerson], function () { }).calls(2, null);
                }
            }
            meetingStore = meetingStore.mock("remove").takes(meeting, function () { }).calls(1, null);
        }

        rules = rulesMock;

        beginTest(function () {

            endTest();
            rulesMock.assertThrows();
            meetingStore.assertThrows();
            assert.strictEqual(meetingStore.findMeetingsWithin.count, 2, "#findMeetingsWithin() should only be called once at the start, and once per periodic processing loop.");
            done();
        });

    });


});