var http = require("http");
var urlformatter = require("url");
var mapquest = require("mapquest");
var apikey = require("./config")().bingkey;
var inspect = require("util").inspect;
var log = require("./log")("geol");

function geocode(location, callback) {
    geocodeBing(location, callback, 1);
}

function geocodeBing(location, callback, attemptNumber)
{
    var query = {
        q: location,
        key: apikey,
        maxRes: 1,
        ul: "-27.4667,153.0333"
    };

    var url = urlformatter.format({
        protocol: 'http:',
        hostname: 'dev.virtualearth.net',
        pathname: '/REST/v1/Locations',
        query: query
    });

    var request = http.get(url, function (response) {
        if (response.statusCode != 200) {
            onError(new Error("Status code was " + response.statusCode + ". Is the Bing API key correct?"));
            return;
        }

        var data = "";
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
            data += chunk;
        });
        response.on("end", function () {
            var rateLimited = (response.headers['x-ms-bm-ws-info'] === "1");
            onResponse(data, rateLimited);
        });
    });

    request.on("error", function (error) {
        log("Geolocation http request failed.");
        onError(error);
    });

    function onResponse(response, rateLimited)
    {
        try
        {
            handleResponse(response);
        }
        catch (error) {
            if (!rateLimited || !(error instanceof RangeError))
                onError(error);
            else
                onRateLimited();
        }
    }

    function handleResponse(response) {
        var result = JSON.parse(response);
        if (!result.resourceSets)
            throw new TypeError("Could not geocode (empty response).");
        var resourceSets = result.resourceSets;
        if (!resourceSets[0])
            throw new TypeError("Could not geocode (empty result sets).");
        var resourceSet = resourceSets[0];
        if (!resourceSet.resources)
            throw new TypeError("Could not geocode (no resources in result set).");
        var resources = resourceSet.resources;
        if (!resources[0])
            throw new RangeError("Could not geocode (no results).");
        var resource = resources[0];
        if (!resource.point)
            throw new TypeError("Could not geocode (no point in result).");
        var point = resource.point;
        if (!point.coordinates)
            throw new TypeError("Could not geocode (no coordinates in result).");
        var coordinates = point.coordinates;
        if (coordinates.length !== 2)
            throw new TypeError("Could not geocode (invalid coordinates in result).");

        callback(undefined, {
            latitude: coordinates[0],
            longitude: coordinates[1]
        });
    }

    function onRateLimited()
    {
        if (attemptNumber >= 6) {
            onError("Could not geocode (Bing persistantly rate limited).");
        }
        else {
            log("Geocoding is rate limited, trying again in 30 seconds (attempt #" + attemptNumber + ").")
            setTimeout(function () {
                geocodeBing(location, callback, attemptNumber + 1);
            }, 30000);
        }
    }

    function onError(error) {
        log("Geolocation with Bing failed, trying mapquest. " + error);
        geocodeAlternate(location, callback);
    }
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