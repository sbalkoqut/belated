var assert = require("assert");
var mockery = require("mockery");
var nodemock = require("nodemock");

describe("notificationmanager", function () {
    
    var app;
    var locationStorage;
    var meetingStorage, meetingStore;
    var locationStore;
    var rulesModule, rules;
    var scheduler;
  
    var meetingsWithin;

    var allowedModules = ["./log", "../log", "../notificationmanager"];
    var minute = 60 * 1000;

    beforeEach(function () {
        app = { "Mock instance of Type": "App" };

        meetingsWithin = [];

        scheduler = nodemock.mock("RecurrenceRule").returns({ "Mock instance of Type": "RecurrenceRule" });
        scheduler.mock("scheduleJob").takes({ "Mock instance of Type": "RecurrenceRule", minute: [1, 31] }, function () { });
    });

    function beginTest() {
        function extendMeetingStore() {
            meetingStore = meetingStore || { };

            meetingStore.getMeetingsWithin = function (start, end) {
                if (!meetingStore.getMeetingsWithin.end)
                    meetingStore.getMeetingsWithin.end = Date.now();
                var expectedStart = meetingStore.getMeetingsWithin.end;
                var expectedEnd = Date.now() + 3 * 60 * minute;

                assert(start.getTime() <= expectedStart, "#getMeetingsWithin was not called with a correct start parameter.");
                assert(start.getTime() > (expectedStart - 100), "#getMeetingsWithin was not called with a correct start parameter.");
                assert(end.getTime() <= expectedEnd, "#getMeetingsWithin was not called with a correct end parameter.");
                assert(end.getTime() > (expectedEnd - 100), "#getMeetingsWithin was not called with a correct end parameter.");

                meetingStore.getMeetingsWithin.end = end.getTime();
                meetingStore.getMeetingsWithin.start = start.getTime();
                meetingStore.getMeetingsWithin.count++;
                
                if (meetingStore.getMeetingsWithin.count == 2)
                    return meetingsWithin;
                else
                    return [];
            }
            meetingStore.getMeetingsWithin.count = 0;
        }

        extendMeetingStore();

        mockery.registerAllowables(allowedModules);

        locationStorage = nodemock.mock("create").returns(locationStore);
        meetingStorage = nodemock.mock("create").returns(meetingStore);
        rulesModule = nodemock.mock("create").takes(app, locationStore).returns(rules);

        mockery.registerMock("./notificationrules", rulesModule.create);
        mockery.registerMock("./locationstore", locationStorage.create);
        mockery.registerMock("./meetingstore", meetingStorage.create);
        mockery.registerMock("node-schedule", scheduler);
        
        mockery.enable({ useCleanCache: true });

        nm = require("../notificationmanager")(app);
    }

    function endTest() {
        rulesModule.assertThrows();
        locationStorage.assertThrows();
        meetingStorage.assertThrows();
        scheduler.assertThrows();
    }

    afterEach(function () {
        rules = undefined;
        locationStore = undefined;
        meetingStore = undefined;
        rulesModule = undefined;
        locationStorage = undefined;
        meetingStorage = undefined;
        mockery.deregisterAll();
        mockery.disable();
    });


    it("should store location updates", function () {
        var position = {
            latitude: -52.821732,
            longitude: -23.1232,
            email: "john.smith@gmail.com",
            lastUpdate: new Date(2013, 6, 13, 10, 17, 39)
        };
        locationStore = nodemock.mock("setPosition").takes(position);

        beginTest();

        nm.handleLocation(position);

        endTest();
        locationStore.assert();
        assert.strictEqual(meetingStore.getMeetingsWithin.count, 1, "#getMeetingsWithin() should only be called once at the start.");
    });

    it("should just store meetings more than 3 hours away", function () {
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
        meetingStore = nodemock.mock("add").takes(meeting);

        beginTest();

        meeting.start = new Date(meetingStore.getMeetingsWithin.end + 1);
        meeting.end = new Date(meetingStore.getMeetingsWithin.end + 1001);

        nm.handleMeeting(meeting);

        endTest();
        meetingStore.assertThrows();
        assert.strictEqual(meetingStore.getMeetingsWithin.count, 1, "#getMeetingsWithin() should only be called once at the start.");
    });

    it("should schedule (and store) meetings within 3 hours away", function () {
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
        meetingStore = nodemock.mock("add").takes(meeting);
        
        var rulesMock = nodemock;

        var minutesBefore = [0, 5, 15, 30];

        for (var i = 0; i < minutesBefore.length; i++) {
            var scheduleDate = new Date(startTime - (minutesBefore[i] * minute));
            scheduleDate.time = scheduleDate.getTime();
            scheduler.mock("scheduleJob").takes(scheduleDate, function () { }).calls(1);
            rulesMock = rulesMock.mock("runLogic").takes(meeting, minutesBefore[i]);
        }

        rules = rulesMock.runLogic;


        beginTest();

        nm.handleMeeting(meeting);

        endTest();
        rulesMock.assertThrows();
        meetingStore.assertThrows();
        assert.strictEqual(meetingStore.getMeetingsWithin.count, 1, "#getMeetingsWithin() should only be called once at the start.");
    });

    it("should periodically retreive new meetings and schedule them", function () {

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

        var minutesBefore = [0, 5, 15, 30, 60, 120];
        for (var m = 0; m < meetingsWithin.length; m++) {
            for (var i = 0; i < minutesBefore.length; i++) {
                var scheduleDate = new Date(meetingsWithin[m].start.getTime() - (minutesBefore[i] * minute));
                scheduleDate.time = scheduleDate.getTime();
                scheduler.mock("scheduleJob").takes(scheduleDate, function () { }).calls(1);
                rulesMock = rulesMock.mock("runLogic").takes(meetingsWithin[m], minutesBefore[i]);
            }
        }

        rules = rulesMock.runLogic;

        beginTest();

        endTest();
        rulesMock.assertThrows();
        assert.strictEqual(meetingStore.getMeetingsWithin.count, 2, "#getMeetingsWithin() should only be called once at the start, and once per periodic processing loop.");

    });


});