var nodemock = require("nodemock");
var assert = require("assert");
var locationStorage = require("../locationstore");

var samplePositions = [
        {
            latitude: 8.932,
            longitude: 192.324,
            email: "john@gmail.com",
            lastUpdate: new Date(2013, 5, 3, 7, 43, 21)
        },
        {
            latitude: 6,
            longitude: 21.2,
            email: "david@gmail.com",
            lastUpdate: new Date(2013, 5, 3, 7, 55, 23)
        }];

describe("locationStore", function () {
   
    describe("#setPosition", function () {
        var locationStore;
        beforeEach(function () {
            locationStore = locationStorage();
        });

        function set(position) {
            locationStore.setPosition(position);
        }

        function verify(position) {
            var retreivedPosition = locationStore.getPosition(position.email);
            assert.deepEqual(position, retreivedPosition, "Retreived positions should be identical to those set.");
        }
        
        it("should support storing locations of multiple people", function () {
            set(samplePositions[0]);
            verify(samplePositions[0]);
            set(samplePositions[1]);
            verify(samplePositions[0]);
            verify(samplePositions[1]);
        });

        it("should overwrite existing locations when new location data is sent.", function () {
            var position = {
                latitude: 70.132456,
                longitude: 30.321321,
                email: "john@gmail.com",
                lastUpdate: new Date(2013, 5, 4, 17, 21, 49)
            };
            set(position);
            verify(position);
            position = {
                latitude: 6,
                longitude: 21.2,
                email: "john@gmail.com",
                lastUpdate: new Date(2013, 5, 4, 17, 23, 51)
            };
            set(position);
            verify(position);
            position = {
                latitude: 0,
                longitude: -23.1232,
                email: "john@gmail.com",
                lastUpdate: new Date(2013, 5, 4, 17, 17, 39)
            };
            set(position);
            verify(position);
        });
    });

    describe("#getPosition", function () {
        it("should return undefined when no position has been received", function () {
            var locationStore = locationStorage();
            assert.strictEqual(locationStore.getPosition("john@gmail.com"), undefined);
        });
    });
});