var nodemock = require("nodemock");
var assert = require("assert");
var locationHandler = require("../lib/locationhandler");

describe("locationHandler", function () {
    describe("#create", function () {
        

        function runTest(body, responseCode, validRequest, method) {
            function validateResult(startTime, endTime, position) {
                var recordedTime = position.timestamp.getTime();

                    assert((recordedTime >= startTime) && (recordedTime <= endTime), "The time recorded alongside the position should be around the time the method is called.");

                    assert.deepEqual(position, {
                        email: body.email,
                        latitude: body.lat,
                        longitude: body.lng,
                        timestamp: new Date(recordedTime)
                    });
            }
            if (!responseCode)
                responseCode = 200;
            if (!method)
                method = "POST";
            if (validRequest !== false)
                validRequest = true;

            var response = nodemock.mock("send").takes(responseCode);
            var startTime = Date.now();
            var callbackReceived = false;

            handler = locationHandler(function (error, position) {
                var endTime = Date.now();
                callbackReceived = true;

                assert.strictEqual((error === undefined), validRequest, "Errors should only be thrown for invalid requests.");
                if (!error)
                    validateResult(startTime, endTime, position);
            });
            
            handler({
                method: method,
                body: body
            }, response);

            response.assertThrows();
            assert(callbackReceived, "A callback must be done for every request.");
        }

        it("should succesfully handle valid location requests", function () {
            runTest({
                lat: -1.9343,
                lng: 193.334,
                email: "david@gmail.com"
            });
        });

        it("should reject requests using improper methods.", function () {
            runTest({
                lat: 0,
                lng: -23.1232,
                email: "john@gmail.com"
            }, 405, false, "GET");
            runTest({
                lat: 0,
                lng: -23.1232,
                email: "john@gmail.com"
            }, 405, false, "PUT");
            runTest({
                lat: 0,
                lng: -23.1232,
                email: "john@gmail.com"
            }, 405, false, "DELETE");
        });

        it("should reject requests with invalid or incomplete data.", function () {
            runTest({
                lng: -23.1232,
                email: "john@gmail.com"
            }, 400, false);
            result = runTest({
                lat: 0,
                lng: -23.1232,
                email: "j@a"
            }, 400, false);
            runTest({}, 400, false);
        });
    });
});