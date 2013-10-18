var assert = require("assert");
var mockery = require("mockery");
var nodemock = require("nodemock");

describe("notificationmanager", function () {
    
    var meetingStore;
    var locationStore;
    var locationDefaults;
    var dataStores;
    var notificationRules;
    var notificationLogic;
    var scheduler;
    var schedule;
    var geocoder;
    var app;

    var instance;

    beforeEach(function () {
        app = { mock: "app" };
        meetingStore = nodemock.mock("random").fail();
        locationStore = nodemock.mock("random").fail();
        schedule = nodemock.mock("random").fail();
        notificationLogic = nodemock.mock("random").fail();

        dataStores = { meetings: meetingStore, locations: locationStore };
        notificationRules = nodemock.mock("create").takes(app, locationStore).returns(notificationLogic);
        scheduler = nodemock.mock("create").takes(meetingStore, notificationLogic).returns(function (meeting) {
            return schedule.schedule(meeting);
        });
        geocoder = nodemock.mock("random").fail();
        locationDefaults = nodemock.mock("random").fail();

        mockery.registerMock("./notificationrules", notificationRules.create);
        mockery.registerMock("./notificationscheduler", scheduler.create);
        mockery.registerMock("./geocoder", function (location, callback) {
            geocoder.geocode(location, callback);
        });
        mockery.registerMock("./locationdefaults", function (email) {
            return locationDefaults.defaultFor(email);
        });
        
        var log = nodemock.mock("create").takes("noti").returns(nodemock.ignore("log").log);
        mockery.registerMock("./log", log.create);
       
        mockery.registerAllowable("util");
        mockery.registerAllowable("../lib/notificationmanager");
        mockery.enable({ useCleanCache: true });
    });
    
    function getInstance()
    {
        return require("../lib/notificationmanager")(app, dataStores);
    }

    it("#should create without error", function () {
        getInstance();
    });

    describe("#handleMeetingRequest", function () {
        var instance;
        beforeEach(function () {
            instance = getInstance();
        });

        it("should geocode, update, schedule & send confirmation for new meetings", function (done) {
            var meeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "Somewhere #1"
            };
            var geocodedLocation = {
                latitude: 82.32,
                longitude: 132.32
            }
            var insertedMeeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "Somewhere #1",
                latitude: 82.32,
                longitude: 132.32,
                isLocationDetermined: true
            };
            var storedMeeting = null;
            meetingStore.mock("findMeetingBy").takes(meeting.organiser.email, meeting.calUId, function () { }).calls(2, [null, storedMeeting]);
            geocoder.mock("geocode").takes(meeting.location, function () { }).calls(1, [null, geocodedLocation]);
            meetingStore.mock("add").takes(insertedMeeting, function () { }).calls(1, [null]);
            locationDefaults.mock("defaultFor").takes(meeting.organiser.email).returns({ latitude: 0, longitude: 0 });

            var occursInFuture = { mock: occursInFuture };
            schedule.mock("schedule").takes(insertedMeeting).returns(occursInFuture);
            notificationLogic.mock("initial").takes(insertedMeeting, occursInFuture);

            instance.handleMeetingRequest(meeting);

            assertOK();
            done();
        });

        it("should update, schedule & send confirmation for new meetings without locations", function (done) {
            var meeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: ""
            };
            var insertedMeeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "",
                latitude: 82.32,
                longitude: 132.32,
                isLocationDetermined: false
            };
            var storedMeeting = null;
            meetingStore.mock("findMeetingBy").takes(meeting.organiser.email, meeting.calUId, function () { }).calls(2, [null, storedMeeting]);
            meetingStore.mock("add").takes(insertedMeeting, function () { }).calls(1, [null]);
            locationDefaults.mock("defaultFor").takes(meeting.organiser.email).returns({ latitude: 82.32, longitude: 132.32 });

            var occursInFuture = { mock: occursInFuture };
            schedule.mock("schedule").takes(insertedMeeting).returns(occursInFuture);
            notificationLogic.mock("initial").takes(insertedMeeting, occursInFuture);

            instance.handleMeetingRequest(meeting);

            assertOK();
            done();
        });

        it("should try geocode, update, schedule & send confirmation for new meetings with non-geocodable locations", function (done) {
            var meeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "South Building, Floor 5"
            };
            var insertedMeeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "South Building, Floor 5",
                latitude: 82.32,
                longitude: 132.32,
                isLocationDetermined: false
            };
            var storedMeeting = null;
            meetingStore.mock("findMeetingBy").takes(meeting.organiser.email, meeting.calUId, function () { }).calls(2, [null, storedMeeting]);
            geocoder.mock("geocode").takes(meeting.location, function () { }).calls(1, [new RangeError("No results."), null]);
            meetingStore.mock("add").takes(insertedMeeting, function () { }).calls(1, [null]);
            locationDefaults.mock("defaultFor").takes(meeting.organiser.email).returns({ latitude: 82.32, longitude: 132.32 });

            var occursInFuture = { mock: occursInFuture };
            schedule.mock("schedule").takes(insertedMeeting).returns(occursInFuture);
            notificationLogic.mock("initial").takes(insertedMeeting, occursInFuture);

            instance.handleMeetingRequest(meeting);

            assertOK();
            done();
        });


        it("should geocode, update, schedule & send confirmation for updated meetings with changed locations", function (done) {
            var meeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "Somewhere #2"
            };
            var geocodedLocation = {
                latitude: 82.32,
                longitude: 132.32
            };
            var insertedMeeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "Somewhere #2",
                latitude: 82.32,
                longitude: 132.32,
                isLocationDetermined: true
            };
            var storedMeeting = {
                mock: "stored meeting",
                location: "Somewhere else"
            };
            meetingStore.mock("findMeetingBy").takes(meeting.organiser.email, meeting.calUId, function () { }).calls(2, [null, storedMeeting]);
            geocoder.mock("geocode").takes(meeting.location, function () { }).calls(1, [null, geocodedLocation]);
            meetingStore.mock("updateDetail").takes(storedMeeting, insertedMeeting, function () { }).calls(2, [null]);
            locationDefaults.mock("defaultFor").takes(meeting.organiser.email).returns({ latitude: 0, longitude: 0 });

            var occursInFuture = { mock: occursInFuture };
            schedule.mock("schedule").takes(storedMeeting).returns(occursInFuture);
            notificationLogic.mock("initial").takes(storedMeeting, occursInFuture);

            instance.handleMeetingRequest(meeting);

            assertOK();
            done();
        });

        it("should update & schedule updated meetings without changed locations", function (done) {
            var meeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "Somewhere #3"
            };
            var geocodedLocation = {
                latitude: 82.32,
                longitude: 132.32
            };
            var insertedMeeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "Somewhere #3",
                isLocationDetermined: false
            };
            var storedMeeting = {
                mock: "stored meeting",
                location: "Somewhere #3"
            };
            meetingStore.mock("findMeetingBy").takes(meeting.organiser.email, meeting.calUId, function () { }).calls(2, [null, storedMeeting]);
            meetingStore.mock("updateDetail").takes(storedMeeting, insertedMeeting, function () { }).calls(2, [null]);
            locationDefaults.mock("defaultFor").takes(meeting.organiser.email).returns({ latitude: 0, longitude: 0 });

            var occursInFuture = { mock: occursInFuture };
            schedule.mock("schedule").takes(storedMeeting).returns(occursInFuture);

            instance.handleMeetingRequest(meeting);

            assertOK();
            done();
        });

        afterEach(function () {
            instance = null;
        });
    });

    describe("#handleMeetingCancellation", function () {
        var instance;
        beforeEach(function () {
            instance = getInstance();
        });

        it("should cancel meetings if they exist", function (done) {
            var meeting = {
                organiser: { name: "David Dumblebee", email: "d.dumblebee@gmail.com" },
                calUId: "3ABCA9221A8726DD@gmail.com",
                location: "Somewhere #4"
            };
            var storedMeeting = {
                mock: "stored meeting",
                location: "Somewhere #4"
            };
            meetingStore.mock("findMeetingBy").takes(meeting.organiser.email, meeting.calUId, function () { }).calls(2, [null, storedMeeting]);
            meetingStore.mock("remove").takes(storedMeeting, function () { }).calls(1, [null]);

            instance.handleMeetingCancellation(meeting);

            assertOK();
            done();
        });

        afterEach(function () {
            instance = null;
        });
    });

    describe("#handleLocation", function () {
        var instance;
        beforeEach(function () {
            instance = getInstance();
        });

        it("should forward location updates to the location store", function (done) {
            var position = {
                latitude: -52.821732,
                longitude: -23.1232,
                email: "john.smith@gmail.com",
                lastUpdate: new Date(2013, 6, 13, 10, 17, 39)
            };
            locationStore.mock("recordPosition").takes(position);
            instance.handleLocation(position);
            assertOK();
            done();
        });

        afterEach(function () {
            instance = null;
        });
    });

    function assertOK() {
        notificationRules.assertThrows();
        notificationLogic.assertThrows();
        scheduler.assertThrows();
        geocoder.assertThrows();
        meetingStore.assertThrows();
        locationStore.assertThrows();
        schedule.assertThrows();
        locationDefaults.assertThrows();
    }

    afterEach(function () {
        mockery.disable();
        mockery.deregisterMock("./notificationrules");
        mockery.deregisterMock("./notificationscheduler");
        mockery.deregisterMock("./geocoder");
        mockery.deregisterMock("./log");
        mockery.deregisterMock("./locationdefaults");
        mockery.deregisterAllowable("util");
        mockery.deregisterAllowable("../lib/notificationmanager");
    });
});