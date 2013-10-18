var log = require("./log")("locationdefault");
var utils = require("./utils");

function load(path) {
    var rules;
    try {
        var configuration = require(path);
        rules = parse(configuration);
    }
    catch (e) {
        log("Couldn't load location default config file, assuming default.");
        log("(" + e.message + ")");
        rules = [{ email: "*", latitude: -27.477491, longitude: 153.028395 }]; // QUT Gardens Point.
    }
    return rules;
    
    function parse(config)
    {
        var emails = [];
        var rules = [];

        if (!utils.isArray(config) || config.length < 1)
            throw new TypeError("The configuration are not an array with at least one rule.");
        else {
            for (var i = 0; i < config.length; i++) {
                var rule = config[i];
                if (!rule || !utils.isObject(rule))
                    throw new TypeError("One of the rules is invalid.");

                if (!utils.isString(rule.email))
                    throw new TypeError("One of the rules does not have an email.");
                if (!utils.isString(rule.lat))
                    throw new TypeError("One of the rules does not have a latitude.");
                if (!utils.isString(rule.lng))
                    throw new TypeError("One of the rules does not have a longitude.");

                var latitude = parseFloat(rule.lat);
                var longitude = parseFloat(rule.lng);
                if (!isFinite(latitude) || latitude > 90 || latitude < -90)
                    throw new RangeError("One of the rules has an invalid latitude.");
                if (!isFinite(longitude) || longitude > 180 || longitude < -180)
                    throw new RangeError("One of the rules has an invalid longitude.");

                if (emails.indexOf(rule.email) >= 0)
                    throw new RangeError("The same email, " + rule.email + " may not be used in two rules.");

                emails.push(rule.email);
                if (rule.email !== "*") {
                    rules.push({ email: rule.email, latitude: latitude, longitude: longitude });
                }
                else {
                    rules.unshift({ email: "*", latitude: latitude, longitude: longitude });
                }
            }
        }

        return rules;
    }
}

var rules = load("../defaultlocations.json");

function defaultFor(email)
{
    var rule = rules[0];
    for (var i = 1; i < rules.length; i++)
    {
        if (rules[i].email === email)
        {
            rule = rules[i];
            break;
        }
    }
    return { latitude: rule.latitude, longitude: rule.longitude };
}

exports = module.exports = defaultFor;