var assert = require("assert");
var nodemock = require("nodemock");
var meetingStore = require("../lib/meetingstore")
describe("persistant meeting store", function () {
    
    var dbMock;
    var collectionMock;

    beforeEach(function () {
        collectionMock = nodemock.mock("ensureIndex").takes({ start: 1 }, { w: 1 }, function () { }).calls(2, [null, null])
        dbMock = nodemock.mock("createCollection").takes("meetings", { w: 1 }, function () { }).calls(2, [null, collectionMock]);
    });

    function assertMocks() {
        collectionMock.assertThrows();
        dbMock.assertThrows();
    }

    afterEach(function () {
        collectionMock = undefined;
        dbMock = undefined;
    });

    it("should add records successfully", function (done) {
        var record = {
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr" },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com" }, { name: "Quan Ping", email: "quan.ping@web.ch" }]
        };
        collectionMock.mock("insert").takes(record, { w: 1 }, function () { }).calls(2, [null, undefined]);
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.add(record, function (error) {
                assert.strictEqual(error, null, "#error after add should be null.");
                assertMocks();
                done();
            });
        });
    });

    it("should update which meeting participants have been notified as late", function (done) {
        var id = { id: "Imitation instance of ObjectID" };
        var before = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: false },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: false }]
        };
        var after = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr", notifiedLate: true },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com", notifiedLate: false }, { name: "Quan Ping", email: "quan.ping@web.ch", notifiedLate: true }]
        };

        var update = {
            $set: {
                "organiser.notifiedLate": true,
                "attendees.1.notifiedLate": true
            }
        };
        console.log(update);
        collectionMock.mock("update").takes({ _id: id }, update, { w: 1 }, function () { }).calls(3, [null, undefined]);
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");

            store.updateNotifiedLatePersons(before, [before.organiser, before.attendees[1]], function (error) {
                assert.strictEqual(error, null, "#error after update should be null.");
                assert.deepEqual(before, after, "meeting should be updated to reflect database state");
                assertMocks();
                done();
            });
        });
    });

    it("should remove records successfully", function (done) {
        var id = { id: "Imitation instance of ObjectID" };
        var record = {
            _id: id,
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr" },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com" }, { name: "Quan Ping", email: "quan.ping@web.ch" }]
        };
        collectionMock.mock("remove").takes({ _id: id }, { w: 1 }, function () { }).calls(2, [null, undefined]);
        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.remove(record, function (error) {
                assert.strictEqual(error, null, "#error after add should be null.");
                assertMocks();
                done();
            });
        });
    });

    it("should find records between a certain range successfully", function (done) {

        var records = [{
            _id: { id: "Imitation instance of ObjectID" },
            start: new Date(2010, 1, 1, 5, 30, 0, 0),
            end: new Date(2010, 1, 1, 6, 0, 0, 0),
            location: "Eiffel Tower",
            latitude: 48.85869,
            longitude: 2.294285,
            subject: "Meeting in Paris",
            description: "To discuss le landmarks.",
            emailId: "8392ea18321b213c4d2deca3423@somewhere.com",
            organiser: { name: "Pierre Lantern", email: "pierre.lantern@web.fr" },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com" }, { name: "Quan Ping", email: "quan.ping@web.ch" }]
        }, {
            _id: { id: "Imitation instance of ObjectID2" },
            start: new Date(2010, 1, 1, 6, 30, 0, 0),
            end: new Date(2010, 1, 1, 7, 0, 0, 0),
            location: "Brandenburger Tor",
            latitude: 52.516675,
            longitude: 13.377808,
            subject: "Meeting in Berlin",
            description: "To discuss ze landmarks.",
            emailId: "7392ea32421b213c4d2ddba3010@somewhere.com",
            organiser: { name: "Johnas Schmidt", email: "j.schmidt@web.de" },
            attendees: [{ name: "Seemore Joker", email: "seemore.joker@web.com" }, { name: "Ian Ling", email: "ian.ling@web.ch" }]
        }];
        var start = new Date(2010, 1, 1, 5, 30);
        var end = new Date(2010, 1, 1, 6, 30);

        var cursorMock = nodemock.mock("toArray").takes(function () { }).calls(0, [null, records]);
        collectionMock.mock("find").takes({ start: { $gte: start, $lte: end } }).returns(cursorMock);

        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.findMeetingsWithin(start, end, function (error, result) {
                assert.strictEqual(error, null, "#error after add should be null.");
                assert.strictEqual(result, records);

                cursorMock.assertThrows()
                assertMocks();
                done();
            });
        });
    });
});