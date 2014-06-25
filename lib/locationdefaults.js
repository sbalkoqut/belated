var log = require("./log")("locationdefault");
var utils = require("./utils");

var rules;
var usedEmails;

load("../defaultlocations.json");

function load(path) {
    try {
        var configFile = require(path);
        parse(configFile);
    }
    catch (e) {
        log.warn("Couldn't load location default config file, assuming default. " + e.message);
        assumeDefaults();
    }
}

function assumeDefaults()
{
    clearRules();
    addRule({ email: "*", latitude: -27.477491, longitude: 153.028395 }); // QUT Gardens Point.
}

function parse(configFile) {
    clearRules();

    if (!utils.isArray(configFile) || configFile.length < 1)
        throw new TypeError("The configuration are not an array with at least one rule.");

    configFile.forEach(function (entry) {
        parseRule(entry);
    });
}

function clearRules()
{
    rules = [];
    usedEmails = [];
}

function parseRule(entry)
{
    useEntry(entry);

    var latitude = parseFloat(entry.lat);
    var longitude = parseFloat(entry.lng);

    useLatLng(latitude, longitude);
    useEmail(entry.email);

    var rule = { email: entry.email, latitude: latitude, longitude: longitude };
    addRule(rule);
}

function useEntry(entry)
{
    if (!entry || !utils.isObject(entry))
        throw new TypeError("One of the rules is invalid.");

    if (!utils.isString(entry.email))
        throw new TypeError("One of the rules does not have an email.");
    if (!utils.isString(entry.lat))
        throw new TypeError("One of the rules does not have a latitude.");
    if (!utils.isString(entry.lng))
        throw new TypeError("One of the rules does not have a longitude.");
}

function useLatLng(latitude, longitude)
{
    if (!isFinite(latitude) || latitude > 90 || latitude < -90)
        throw new RangeError("One of the rules has an invalid latitude.");
    if (!isFinite(longitude) || longitude > 180 || longitude < -180)
        throw new RangeError("One of the rules has an invalid longitude.");
}

function useEmail(email)
{
    if (usedEmails.indexOf(email) >= 0)
        throw new RangeError("The same email, " + email + " may not be used in two rules.");
    usedEmails.push(email);
}

function addRule(rule)
{
    if (rule.email !== "*")
        rules.push(rule);
    else
        rules.unshift(rule);
}

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