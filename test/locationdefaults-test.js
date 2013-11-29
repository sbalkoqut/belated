var assert = require("assert");
var mockery = require("mockery");
var nodemock = require("nodemock");

describe("#locationdefaults", function () {
    var rules;
    beforeEach(function () {
        rules = [
            {email: "david@example.com",lat:"31.2", lng:"91.92"},
            {email: "johnny@example.com",lat:"32", lng:"92"},
            {email: "*",lat:"32.923", lng:"93.1232"},
            { email: "smith@example.com", lng: "93.01", lat: "33.001" }
        ];
        mockery.registerMock("../defaultlocations.json", rules);

        var log = nodemock.mock("create").takes("locationdefault").returns(nodemock.ignore("log").log);
        mockery.registerMock("./log", log.create);

        mockery.registerAllowable("./utils");
        mockery.registerAllowable("../lib/locationdefaults");
        mockery.enable({ useCleanCache: true });
    });

    function getInstance()
    {
        return require("../lib/locationdefaults");
    }

    it("should return the correct global default location for a previously unknown email", function () {
        var instance = getInstance();

        var location = instance("random@example.com");
        assert.deepEqual(location, { latitude: 32.923, longitude: 93.1232 });
    });

    it("should return the correct global default location for a previously known email", function () {
        var instance = getInstance();

        var location = instance("david@example.com");
        assert.deepEqual(location, { latitude: 31.2, longitude: 91.92 });

        location = instance("johnny@example.com");
        assert.deepEqual(location, { latitude: 32, longitude: 92});

        location = instance("smith@example.com");
        assert.deepEqual(location, { latitude: 33.001, longitude: 93.01 });
    });

    afterEach(function () {
        mockery.disable();
        mockery.deregisterMock("../defaultlocations.json");
        mockery.deregisterMock("./log");
        mockery.deregisterAllowable("util");
        mockery.deregisterAllowable("./locationdefaults");
    });
});