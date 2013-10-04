var assert = require("assert");
var nodemock = require("nodemock");
var mockery = require("mockery");

describe("persistant meeting store", function () {
    
    var dbMock;
    var collectionMock;
    var objectIdMock;
    var meetingStore;

    var allowedModules = ["./utils", "../lib/meetingstore"];

    beforeEach(function () {
        collectionMock = nodemock
            .mock("ensureIndex").takes({ start: 1 }, { w: 1 }, function () { }).calls(2, [null, null])
            .mock("ensureIndex").takes({ "organiser.email": 1 }, { w: 1 }, function () { }).calls(2, [null, null])
            .mock("ensureIndex").takes({ "attendees.email": 1 }, { w: 1 }, function () { }).calls(2, [null, null])
            .mock("ensureIndex").takes({ "organiser.email": 1, "calUId": 1 }, { w: 1 }, function () {}).calls(2, [null, null]);
        dbMock = nodemock.mock("createCollection").takes("meetings", { w: 1 }, function () { }).calls(2, [null, collectionMock]);
        
    });

    function beforeTest()
    {
        mockery.registerAllowables(allowedModules);

        var mongodb = { ObjectID: null };
        if (objectIdMock)
            mongodb.ObjectID = objectIdMock.ObjectID;
        mockery.registerMock("mongodb", mongodb);

        var logMock = nodemock.mock("create").takes("msto").returns(nodemock.ignore("log").log);
        mockery.registerMock("./log", logMock.create);

       // mockery.registerAllowable("./log");

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
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 1,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", track: true, notifiedLate: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: false }, { name: "Quan Ping", email: "quan.ping@web.ch", track: true }]
        };
        var insertedRecord = {
            _id: { id: "Imitation instance of ObjectID" },
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 1,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", track: true, notifiedLate: false },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: false, notifiedLate: false }, { name: "Quan Ping", email: "quan.ping@web.ch", track: true, notifiedLate: false }]
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

    it("#get should get records successfully", function (done) {
        var id = "8a7bda78faebca543ba10bab";
        var objectId = { id: "Imitation instance of ObjectId 8a7bda78faebca543ba10bab" };
        var record = {
            _id: objectId,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 3,
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
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 2,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: true }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false, track: true }]
        };
        var after = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 2,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: true, track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: true, deleted: false },
                { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: true, track: true, deleted: false }]
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
            isLocationDetermined: false,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 1,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: false },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: false }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false, track: false }]
        };
        var after = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: true,
            latitude: 48.9101,
            longitude: 2.31231,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 1,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: false },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: false, deleted: false }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false, track: false, deleted: false }]
        };

        var update = {
            $set: {
                "isLocationDetermined": true,
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
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 1,
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
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 1,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: true, deleted: false },
               { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false, track: true, deleted: false },
               { name: "Bismuth Cewl", email: "bismuth.cewl@gmail.com", notifiedLate: false, track: false, deleted: false },
               { name: "Tony Test", email: "tony@test.com", notifiedLate: false, track: false, deleted: false }]
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

    it("#updateDetail should detect changes and update relevant fields", function (done) {
        var id = { id: "Imitation instance of ObjectID" };
        var first = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 1,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: true, track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: true, track: true }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: true, track: true }]
        };
        var firstUpdate = {
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 30, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: false,
            latitude: 48.5,
            longitude: 2.3,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "71A2ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 2,
            organiser: { name: "Pierre L.", email: "pierre.lantern@web.fr", track: false, notifiedLate: false },
            attendees: [
                { name: "Q. Ping", email: "quan.ping@web.ch", notifiedLate: false, track: true },
                { name: "Charlie S.", email: "charlie.s@web.co.uk", track: false },
                { name: "Bismuth Cewl", email: "bismuth.cewl@gmail.com", track: false },
                { name: "Tony Test", email: "tony@test.com", notifiedLate: true, track: true }]
        };
        var firstDBUpdate = {
            $set: {
                "calSequence": 2,
                "end": new Date(2010, 1, 1, 6, 0, 0, 0),
                "emailId": "71A2ea18321b213c4d2deca3423@somewhere.com",
                "organiser.name": "Pierre L.",
                "attendees.0.deleted": true,
                "attendees.1.name": "Q. Ping"
            },
            $push: {
                attendees: {
                    $each: [
                        { name: "Charlie S.", email: "charlie.s@web.co.uk", notifiedLate: false, track: false, deleted: false },
                        { name: "Bismuth Cewl", email: "bismuth.cewl@gmail.com", notifiedLate: false, track: false, deleted: false },
                        { name: "Tony Test", email: "tony@test.com", notifiedLate: false, track: true, deleted: false }]
                }
            }
        };
        var second = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 30, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "71A2ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 2,
            organiser: { name: "Pierre L.", email: "pierre.lantern@web.fr", notifiedLate: true, track: true },
            attendees: [
                { name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: true, track: true, deleted: true },
                { name: "Q. Ping", email: "quan.ping@web.ch", notifiedLate: true, track: true, deleted: false },
                { name: "Charlie S.", email: "charlie.s@web.co.uk", notifiedLate: false, track: false, deleted: false },
                { name: "Bismuth Cewl", email: "bismuth.cewl@gmail.com", notifiedLate: false, track: false, deleted: false },
                { name: "Tony Test", email: "tony@test.com", notifiedLate: false, track: true, deleted: false }]
        };
        var secondUpdate = {
            start: new Date(2010, 1, 1, 6, 0, 0, 0),
            end: new Date(2010, 1, 1, 7, 0, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: false,
            latitude: 48.5,
            longitude: 2.3,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "71A2ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 4,
            organiser: { name: "Pierre L.", email: "pierre.lantern@web.fr", notifiedLate: true, track: false },
            attendees: [
                { name: "Q. Ping", email: "quan.ping@web.ch", notifiedLate: true, track: true },
                { name: "Charlie S.", email: "charlie.s@web.co.uk", track: false },
                { name: "Bismuth Cewl", email: "bismuth.cewl@gmail.com", track: false },
                { name: "Tony Test", email: "tony@test.com", notifiedLate: true, track: true },
                { name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: true, track: true }]
        };
        
        var secondDBUpdate = {
            $set: {
                "calSequence": 4,
                "start": new Date(2010, 1, 1, 6, 0, 0, 0),
                "end": new Date(2010, 1, 1, 7, 0, 0, 0),
                "organiser.notifiedLate": false,
                "attendees.0.deleted": false,
                "attendees.0.notifiedLate": false,
                "attendees.1.notifiedLate" : false
            }
        }

        var third = {
            _id: id,
            start: new Date(2010, 1, 1, 6, 0, 0, 0),
            end: new Date(2010, 1, 1, 7, 0, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: true,
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "71A2ea18321b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 4,
            organiser: { name: "Pierre L.", email: "pierre.lantern@web.fr", notifiedLate: false, track: true },
            attendees: [
                { name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: true, deleted: false },
                { name: "Q. Ping", email: "quan.ping@web.ch", notifiedLate: false, track: true, deleted: false },
                { name: "Charlie S.", email: "charlie.s@web.co.uk", notifiedLate: false, track: false, deleted: false },
                { name: "Bismuth Cewl", email: "bismuth.cewl@gmail.com", notifiedLate: false, track: false, deleted: false },
                { name: "Tony Test", email: "tony@test.com", notifiedLate: false, track: true, deleted: false }]
        };

        var thirdUpdate = {
            start: new Date(2010, 1, 1, 6, 0, 0, 0),
            end: new Date(2010, 1, 1, 7, 0, 0, 0),
            location: "Eiffel Tower Park",
            isLocationDetermined: false,
            latitude: 48.5,
            longitude: 2.3,
            subject: "Meeting in Paris!!!",
            description: "To discuss landmarks and related matters.",
            emailId: "8234567890b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 5,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: true, track: true },
            attendees: [
                { name: "Charlie S.", email: "charlie.s@web.co.uk", track: true },
                { name: "Bismuth C.", email: "bismuth.cewl@gmail.com", track: true },
                { name: "David D.", email: "d.david@gmail.com", track: true }]
        };

        var thirdDBUpdate = {
            $set: {
                "calSequence": 5,
                "location": "Eiffel Tower Park",
                "isLocationDetermined": false,
                "latitude": 48.5,
                "longitude": 2.3,
                "subject": "Meeting in Paris!!!",
                "description": "To discuss landmarks and related matters.",
                "emailId": "8234567890b213c4d2deca3423@somewhere.com",
                "organiser.name": "Pierre Lantern",
                "attendees.0.deleted": true,
                "attendees.1.deleted": true,
                "attendees.3.name": "Bismuth C.",
                "attendees.4.deleted": true,

            },
            $push: {
                attendees: {
                    $each: [
                        { name: "David D.", email: "d.david@gmail.com", notifiedLate: false, track: true, deleted: false }
                    ]
                }
             }
        };

        var fourth = {
            _id: id,
            start: new Date(2010, 1, 1, 6, 0, 0, 0),
            end: new Date(2010, 1, 1, 7, 0, 0, 0),
            location: "Eiffel Tower Park",
            isLocationDetermined: false,
            latitude: 48.5,
            longitude: 2.3,
            subject: "Meeting in Paris!!!",
            description: "To discuss landmarks and related matters.",
            emailId: "8234567890b213c4d2deca3423@somewhere.com",
            calUId: "81BA189AADEF785F30@somewhere.com",
            calSequence: 5,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false, track: true },
            attendees: [
                { name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false, track: true, deleted: true },
                { name: "Q. Ping", email: "quan.ping@web.ch", notifiedLate: false, track: true, deleted: true },
                { name: "Charlie S.", email: "charlie.s@web.co.uk", notifiedLate: false, track: false, deleted: false },
                { name: "Bismuth C.", email: "bismuth.cewl@gmail.com", notifiedLate: false, track: false, deleted: false },
                { name: "Tony Test", email: "tony@test.com", notifiedLate: false, track: true, deleted: true },
                { name: "David D.", email: "d.david@gmail.com", notifiedLate: false, track: true, deleted: false }]
        };

        collectionMock.mock("update").takes({ _id: id }, firstDBUpdate, { w: 1 }, function () { }).calls(3, [null, undefined]);
        collectionMock.mock("update").takes({ _id: id }, secondDBUpdate, { w: 1 }, function () { }).calls(3, [null, undefined]);
        collectionMock.mock("update").takes({ _id: id }, thirdDBUpdate, { w: 1 }, function () { }).calls(3, [null, undefined]);

        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");

            store.updateDetail(first, firstUpdate, function (error) {
                assert.strictEqual(error, null, "#error after update should be null.");
                assert.deepEqual(first, second, "meeting should be updated to reflect database state (update 1).");

                store.updateDetail(first, secondUpdate, function (error) {
                    assert.strictEqual(error, null, "#error after update should be null.");
                    assert.deepEqual(first, third, "meeting should be updated to reflect database state (update 2).");

                    store.updateDetail(first, thirdUpdate, function (error) {

                        assert.strictEqual(error, null, "#error after update should be null.");
                        assert.deepEqual(first, fourth, "meeting should be updated to reflect database state (update 3).");

                        afterTest();
                        assertMocks();
                        done();
                    });
                });

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
            isLocationDetermined: false,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "8AD4238ADB15000A03A@somewhere.com",
            calSequence: 3,
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
            isLocationDetermined: false,
            subject: "Meeting in Paris",
            description: "To discuss le landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "8AD4238ADB15000A03A@somewhere.com",
            calSequence: 1,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: true }, { name: "Quan Ping", email: "quan.ping@web.ch", track: false }]
        }, {
            _id: { id: "Imitation instance of ObjectID2" },
            start: new Date(2010, 1, 1, 6, 30, 0, 0),
            end: new Date(2010, 1, 1, 7, 0, 0, 0),
            location: "Brandenburger Tor",
            isLocationDetermined: true,
            latitude: 52.516675,
            longitude: 13.377808,
            subject: "Meeting in Berlin",
            description: "To discuss ze landmarks.",
            emailId: "7392ea32421b213c4d2ddba3010@somewhere.com",
            calUId: "9BD4238ADD16000A03A@somewhere.com",
            calSequence: 1,
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
                assert.strictEqual(error, null, "#error after find should be null.");
                assert.strictEqual(result, records);

                afterTest();
                cursorMock.assertThrows()
                assertMocks();
                done();
            });
        });
    });

    it("#findMeetingsFor should find meetings for a specific person successfully", function (done) {
        var records = [{
            _id: { id: "Imitation instance of ObjectID" },
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            isLocationDetermined: false,
            subject: "Meeting in Paris",
            description: "To discuss le landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            calUId: "8AD4238ADB15000A03A@somewhere.com",
            calSequence: 2,
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: true }, { name: "Quan Ping", email: "quan.ping@web.ch", track: false }]
        }, {
            _id: { id: "Imitation instance of ObjectID2" },
            start: new Date(2010, 1, 1, 6, 30, 0, 0),
            end: new Date(2010, 1, 1, 7, 0, 0, 0),
            location: "Brandenburger Tor",
            isLocationDetermined: true,
            latitude: 52.516675,
            longitude: 13.377808,
            subject: "Meeting in Berlin",
            description: "To discuss ze landmarks.",
            emailId: "7392ea32421b213c4d2ddba3010@somewhere.com",
            calUId: "9BD4238ADD16000A03A@somewhere.com",
            calSequence: 1,
            organiser: { name: "Johnas Schmidt", email: "j.schmidt@web.de", track: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", track: true }, { name: "Ian Ling", email: "ian.ling@web.ch", track: true }]
        }];
        var cursorMock = nodemock.mock("toArray").takes(function () { }).calls(0, [null, records]);
        collectionMock.mock("find").takes({
            $or: [
                { "organiser.email": "seemore.joker@web.com" },
                { "attendees.email": "seemore.joker@web.com" }
            ]
        }).returns(cursorMock);


        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.findMeetingsFor("seemore.joker@web.com", function (error, result) {
                assert.strictEqual(error, null, "#error after find should be null.");
                assert.strictEqual(result, records);

                afterTest();
                cursorMock.assertThrows();
                assertMocks();
                done();
            });
        });
    });

    it("#findMeetingsBy should find the meeting successfully", function (done) {
        var id1 = { id: "Imitation instance of ObjectID #1" };

        var records = [{
            _id: id1,
            organiser: { email: "j.smith@gmail.com" },
            calUId: "128312ABDABAB213"
        }];
        
        var cursorMock = nodemock.mock("toArray").takes(function () { }).calls(0, [null, records]);
        collectionMock.mock("find").takes({
            $and: [ 
                  { "organiser.email": "j.smith@gmail.com" },
                  { "calUId": "128312ABDABAB213" }
            ]
        }).returns(cursorMock);


        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.findMeetingBy("j.smith@gmail.com", "128312ABDABAB213", function (error, result) {
                assert.strictEqual(error, null, "#error after find should be null.");
                assert.strictEqual(result, records[0]);

                afterTest();
                cursorMock.assertThrows();
                assertMocks();
                done();
            });
            
        });

    });

    it("#findMeetingBy should find the meeting succesfully, and request deletion of any excess returned meetings.", function (done) {
        var id1 = { id: "Imitation instance of ObjectID #1" };
        var id2 = { id: "Imitation instance of ObjectID #2" };

        var records = [{
            _id: id1,
            organiser: { email: "j.smith@gmail.com" },
            calUId: "128312ABDABAB213"
        }, {
            _id: id2,
            organiser: { email: "j.smith@gmail.com" },
            calUId: "128312ABDABAB213"
        }];

        var cursorMock = nodemock.mock("toArray").takes(function () { }).calls(0, [null, records]);
        collectionMock.mock("find").takes({
            $and: [
                  { "organiser.email": "j.smith@gmail.com" },
                  { "calUId": "128312ABDABAB213" }
            ]
        }).returns(cursorMock);

        collectionMock.mock("remove").takes({ _id: id2 }, { w: 0 });

        beforeTest();
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.findMeetingBy("j.smith@gmail.com", "128312ABDABAB213", function (error, result) {
                assert.strictEqual(error, null, "#error after find should be null.");
                assert.strictEqual(result, records[0]);

                afterTest();
                cursorMock.assertThrows();
                assertMocks();
                done();
            });

        });

    });
});