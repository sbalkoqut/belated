var assert = require("assert");
var nodemock = require("nodemock");
var mockery = require("mockery");

describe("persistant meeting store", function () {
    
    var dbMock;
    var collectionMock;
    var objectIdMock;
    var meetingStore;

    var allowedModules = ["./log", "./utils", "../lib/meetingstore"];

    beforeEach(function () {
        collectionMock = nodemock
            .mock("ensureIndex").takes({ start: 1 }, { w: 1 }, function () { }).calls(2, [null, null])
            .mock("ensureIndex").takes({ "organiser.email": 1 }, { w: 1 }, function () { }).calls(2, [null, null])
            .mock("ensureIndex").takes({ "attendees.email": 1 }, { w: 1 }, function () { }).calls(2, [null, null]);
        dbMock = nodemock.mock("createCollection").takes("meetings", { w: 1 }, function () { }).calls(2, [null, collectionMock]);
    });

    function beforeTest()
    {
        mockery.registerAllowables(allowedModules);

        var mongodb = { ObjectID: null };
        if (objectIdMock)
            mongodb.ObjectID = objectIdMock.ObjectID;
        mockery.registerMock("mongodb", mongodb);

        mockery.enable({ useCleanCache: true });
        meetingStore = require("../lib/meetingstore");
    }

    function afterTest()
    {
        mockery.deregisterAll();
        mockery.disable();
    }

    function assertMocks() {
        collectionMock.assertThrows();
        dbMock.assertThrows();
        if (objectIdMock)
            objectIdMock.assertThrows();
    }

    afterEach(function () {
        collectionMock = undefined;
        dbMock = undefined;
        objectIdMock = undefined;
    });

    it("#add should add records successfully", function (done) { 
        var record = {
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: false }, { name: "Quan Ping", email: "quan.ping@web.ch", track: true }]
        };
        var insertedRecord = {
            _id: { id: "Imitation instance of ObjectID" },
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: false }, { name: "Quan Ping", email: "quan.ping@web.ch", track: true }]
        };
        objectIdMock = nodemock.mock("ObjectID").returns({ id: "Imitation instance of ObjectID" });
        collectionMock.mock("insert").takes(insertedRecord, { w: 1 }, function () { }).calls(2, [null, undefined]);

        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.add(record, function (error) {
                assert.strictEqual(error, null, "#error after add should be null.");

                afterTest();
                assertMocks();
                done();
            });
        });
    });

    it("#get should get records succesfully", function (done) {
        var id = "8a7bda78faebca543ba10bab";
        var objectId = { id: "Imitation instance of ObjectId 8a7bda78faebca543ba10bab" };
        var record = {
            _id: objectId,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", track: false },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: true }, { name: "Quan Ping", email: "quan.ping@web.ch", track: true }]
        };
        objectIdMock = nodemock.mock("createFromHexString").takes(id).returns(objectId);
        objectIdMock.ObjectID = { createFromHexString: objectIdMock.createFromHexString };

        collectionMock.mock("findOne").takes({ _id: objectId }, function () { }).calls(1, [null, record]);

        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.get(id, function (error, document) {
                assert.strictEqual(error, null, "#error after get should be null.");
                assert.strictEqual(document, record, "correct document should be returned.");

                afterTest();
                assertMocks();
                done();
            });
        });
    });

    it("#updateNotifiedLatePersons should update which meeting participants have been notified as late", function (done) {
        var id = { id: "Imitation instance of ObjectID" };
        var before = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: true }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false, track: true }]
        };
        var after = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: true, track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: true }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: true, track: true }]
        };

        var update = {
            $set: {
                "organiser.notifiedLate": true,
                "attendees.1.notifiedLate": true
            }
        };
        collectionMock.mock("update").takes({ _id: id }, update, { w: 1 }, function () { }).calls(3, [null, undefined]);

        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");

            store.updateNotifiedLatePersons(before, [before.organiser, before.attendees[1]], function (error) {
                assert.strictEqual(error, null, "#error after update should be null.");
                assert.deepEqual(before, after, "meeting should be updated to reflect database state");

                afterTest();
                assertMocks();
                done();
            });
        });
    });

    it("#updateCoordinate should update the coordinates of a meeting", function (done) {
        var id = { id: "Imitation instance of ObjectID" };
        var before = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: false,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: false },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: false }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false, track: false }]
        };
        var after = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: true,
            latitude: 48.9101,
            longitude: 2.31231,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: false },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: false }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false, track: false }]
        };

        var update = {
            $set: {
                "isGeocoded": true,
                "latitude": 48.9101,
                "longitude": 2.31231
            }
        };
        collectionMock.mock("update").takes({ _id: id }, update, { w: 1 }, function () { }).calls(3, [null, undefined]);

        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");

            store.updateCoordinate(before, { latitude: 48.9101, longitude: 2.31231 }, function (error) {
                assert.strictEqual(error, null, "#error after update should be null.");
                assert.deepEqual(before, after, "meeting should be updated to reflect database state");

                afterTest();
                assertMocks();
                done();
            });
        });
    });

    it("#updateTracking should update which meeting participants are tracked", function (done) {
        var id = { id: "Imitation instance of ObjectID" };
        var before = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: false },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: false },
                { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false, track: true },
                { name: "Bismuth Cewl", email: "bismuth.cewl@gmail.com", notifiedLate: false, track: false },
                { name: "Tony Test", email: "tony@test.com", notifiedLate: false, track: true }]
        };
        var after = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: true },
               { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false, track: true },
               { name: "Bismuth Cewl", email: "bismuth.cewl@gmail.com", notifiedLate: false, track: false },
               { name: "Tony Test", email: "tony@test.com", notifiedLate: false, track: false }]
        };

        var update = {
            $set: {
                "organiser.track": true,
                "attendees.0.track": true,
                "attendees.3.track": false
            }
        };
        collectionMock.mock("update").takes({ _id: id }, update, { w: 1 }, function () { }).calls(3, [null, undefined]);

        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");

            store.updateTracking(before, [{ person: before.organiser, track: true }, { person: before.attendees[0], track: true }, { person: before.attendees[3], track: false }], function (error) {
                
                assert.strictEqual(error, null, "#error after update should be null.");
                assert.deepEqual(before, after, "meeting should be updated to reflect database state");

                afterTest();
                assertMocks();
                done();
            });
        });
    });


    it("#remove should remove records successfully", function (done) {
        var id = { id: "Imitation instance of ObjectID" };
        var record = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: false,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", track: false },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: true }, { name: "Quan Ping", email: "quan.ping@web.ch", track: false }]
        };
        collectionMock.mock("remove").takes({ _id: id }, { w: 1 }, function () { }).calls(2, [null, undefined]);

        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.remove(record, function (error) {
                assert.strictEqual(error, null, "#error after add should be null.");
                afterTest();
                assertMocks();
                done();
            });
        });
    });

    it("#findMeetingsWithin should find records between a certain range successfully", function (done) {

        var records = [{
            _id: { id: "Imitation instance of ObjectID" },
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isGeocoded: false,
            subject: "Meeting in Paris",
            description: "To discuss le landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: true }, { name: "Quan Ping", email: "quan.ping@web.ch", track: false }]
        }, {
            _id: { id: "Imitation instance of ObjectID2" },
            start: new Date(2010, 1, 1, 6, 30, 0, 0),
            end: new Date(2010, 1, 1, 7, 0, 0, 0),
            location: "Brandenburger Tor",
            isGeocoded: true,
            latitude: 52.516675,
            longitude: 13.377808,
            subject: "Meeting in Berlin",
            description: "To discuss ze landmarks.",
            emailId: "7392ea32421b213c4d2ddba3010@somewhere.com",
            organiser: { name: "Johnas Schmidt", email: "j.schmidt@web.de", track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: true }, { name: "Ian Ling", email: "ian.ling@web.ch", track: true }]
        }];
        var start = new Date(2010, 1, 1, 5, 30);
        var end = new Date(2010, 1, 1, 6, 30);

        var cursorMock = nodemock.mock("toArray").takes(function () { }).calls(0, [null, records]);
        collectionMock.mock("find").takes({ start: { $gte: start, $lte: end } }).returns(cursorMock);

        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.findMeetingsWithin(start, end, function (error, result) {
                assert.strictEqual(error, null, "#error after add should be null.");
                assert.strictEqual(result, records);

                afterTest();
                cursorMock.assertThrows()
                assertMocks();
                done();
            });
        });
    });
});