var http = require("http");
var urlformatter = require("url");
var mapquest = require("mapquest");
var apikey = require("./config")().bingkey;
var inspect = require("util").inspect;
var log = require("./log")("geol");

function geocode(location, callback) {
    var url = urlformatter.format({
        protocol: 'http:',
        hostname: 'dev.virtualearth.net',
        pathname: '/REST/v1/Locations',
        query: {
            q: location,
            key: apikey,
            maxRes: 1,
            ul: "-27.4667,153.0333"
        }
    });
    var request = http.get(url, function (response) {
        if (response.statusCode != 200)
            callback(new Error("Status code was " + result.statusCode));

        var data = "";
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
            data += chunk;
        });
        response.on("end", function () {
            try
            {
                var result = JSON.parse(data);
                if (!result.resourceSets)
                    throw new Error("Could not geocode (empty response).");
                var resourceSets = result.resourceSets;
                if (!resourceSets[0])
                    throw new Error("Could not geocode (empty result sets).");
                var resourceSet = resourceSets[0];
                if (!resourceSet.resources)
                    throw new Error("Could not geocode (no resources in result set).");
                var resources = resourceSet.resources;
                if (!resources[0])
                    throw new Error("Could not geocode (no results).");
                var resource = resources[0];
                if (!resource.point)
                    throw new Error("Could not geocode (no point in result).");
                var point = resource.point;
                if (!point.coordinates)
                    throw new Error("Could not geocode (no coordinates in result).");
                var coordinates = point.coordinates;
                if (coordinates.length !== 2)
                    throw new Error("Could not geocode (invalid coordinates in result).");
                callback(undefined, {
                    latitude: coordinates[0],
                    longitude: coordinates[1]
                });
            }
            catch (error)
            {
                log("Geolocation with Bing failed, trying mapquest. " + error);
                geocodeAlternate(location, callback);
            }
        });
    });
    request.on("error", function (error) {
        log("Geolocation http request failed.");
        callback(error);
    });
}

function geocodeAlternate(location, callback) {
    mapquest.geocode(location, function (err, result) {
        if (err || result === undefined || result.latLng === undefined) {
            log("Geolocation with MapQuest failed. All services exhausted.");
            callback(new Error('Could not geocode "' + location + '" (tried with two services).'));
            return;
        }
        callback(undefined, {
            latitude: result.latLng.lat,
            longitude: result.latLng.lng
        });
    });
}

exports = module.exports = geocode;