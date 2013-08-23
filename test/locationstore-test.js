var assert = require("assert");
var nodemock = require("nodemock");
var meetingStore = require("../locationstore")
describe("persistant location store", function () {

    var dbMock;
    var collectionMock;

    beforeEach(function () {
        collectionMock = nodemock.mock("ensureIndex").takes({ email: 1 }, { w: 1 }, function () { }).calls(2, [null, null])
        dbMock = nodemock.mock("createCollection").takes("locations", { w: 1 }, function () { }).calls(2, [null, collectionMock]);
    });

    function assertMocks() {
        collectionMock.assertThrows();
        dbMock.assertThrows();
    }

    afterEach(function () {
        collectionMock = undefined;
        dbMock = undefined;
    });

    it("#recordPosition should record positions successfully (where location update interval <1 minute)", function (done) {
        var location = {
            email: "pierre.lantern@web.fr",
            latitude: 48.85870,
            longitude: 2.294305,
            timestamp: new Date(2010, 1, 1, 5, 28, 14, 5)
        };
        var locationToStore = {
            _id: 123,
            email: "pierre.lantern@web.fr",
            latitude: 48.85870,
            longitude: 2.294305,
            timestamp: new Date(2010, 1, 1, 5, 28, 14, 5)
        };

        var previousUpdates = [{
            _id: 123,
            email: "pierre.lantern@web.fr",
            latitude: 48.85870,
            longitude: 2.294305,
            timestamp: new Date(2010, 1, 1, 5, 28, 3, 832)
        }, {
            _id: 345,
            email: "pierre.lantern@web.fr",
            latitude: 48.85870,
            longitude: 2.294305,
            timestamp: new Date(2010, 1, 1, 5, 27, 53, 163)
        }];
        
        var cursorMock = nodemock.mock("toArray").takes(function () { }).calls(0, [null, previousUpdates]);
        var sortableCursorMock = nodemock.mock("sort").takes([["timestamp", -1]]).returns(cursorMock);
        collectionMock.mock("find").takes({ email: location.email }).returns(sortableCursorMock);

        collectionMock.mock("update").takes({ _id: 123 }, locationToStore, { w: 0 });

        collectionMock.mock("remove").takes({ email: location.email, timestamp: { $lte: new Date(2010, 1, 1, 4, 58, 14, 5) } }, { w: 0 });

        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.recordPosition(location);
           
            cursorMock.assertThrows();
            assertMocks();
            done();
        });
    });

    it("#recordPosition should record positions successfully (where location update interval >=1 minute)", function (done) {
        var location = {
            email: "pierre.lantern@web.fr",
            latitude: 48.85870,
            longitude: 2.294305,
            timestamp: new Date(2010, 1, 1, 5, 28, 14, 5)
        };

        var previousUpdates = [{
            _id: 123,
            email: "pierre.lantern@web.fr",
            latitude: 48.85870,
            longitude: 2.294305,
            timestamp: new Date(2010, 1, 1, 5, 27, 50, 234)
        }];

        var cursorMock = nodemock.mock("toArray").takes(function () { }).calls(0, [null, previousUpdates]);
        var sortableCursorMock = nodemock.mock("sort").takes([["timestamp", -1]]).returns(cursorMock);
        collectionMock.mock("find").takes({ email: location.email }).returns(sortableCursorMock);

        collectionMock.mock("insert").takes(location, { w: 0 });

        collectionMock.mock("remove").takes({ email: location.email, timestamp: { $lte: new Date(2010, 1, 1, 4, 58, 14, 5) } }, { w: 0 });

        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.recordPosition(location);

            cursorMock.assertThrows();
            assertMocks();
            done();
        });
    });


    it("#getLastPosition should retreive the position successfully", function (done) {

        var previousUpdates = [{
            _id: 123,
            email: "pierre.lantern@web.fr",
            latitude: 48.85870,
            longitude: 2.294305,
            timestamp: new Date(2010, 1, 1, 5, 28, 3, 832)
        }, {
            _id: 345,
            email: "pierre.lantern@web.fr",
            latitude: 48.85870,
            longitude: 2.294305,
            timestamp: new Date(2010, 1, 1, 5, 27, 53, 163)
        }];
        var email = previousUpdates[0].email;

        var cursorMock = nodemock.mock("toArray").takes(function () { }).calls(0, [null, previousUpdates]);
        var sortableCursorMock = nodemock.mock("sort").takes([["timestamp", -1]]).returns(cursorMock);
        collectionMock.mock("find").takes({ email: email }).returns(sortableCursorMock);


        meetingStore.create(dbMock, function (error, store) {
            assert.strictEqual(error, null, "#error after initialisation should be null.");
            store.getLastPosition(email, function (error, result) {
                assert.strictEqual(error, null, "#error after getLastPosition should be null.");
                assert.strictEqual(result, previousUpdates[0]);
                assertMocks();
                done();
            });
        });
    });

});