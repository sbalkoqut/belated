var geoDistance = require("geo-distance-js");
var log = require("./log")("rule");

var cumulativeMinutes = [0, 5, 20, 50];
var cumulativeDistance = [100, 428, 7323, 34900];
var speeds = [1.094344, 7.660409, 15.32082, 87.54753];
var vehicle = ["walk", "car", "highway", "plane"];
var comfortableSlack = 0.7;
var comfortableMinsEarly = 5;
var dateFormat = require("dateformat");

function evaluateForPosition(meeting, position) {
    if (position === undefined || position === null)
        return { late: false, comfortable: true, message: "not using Belated app" };

    var distanceInMeters = geoDistance.getDistance(meeting.latitude, meeting.longitude, position.latitude, position.longitude);

    var minutesSinceUpdate = (Date.now() - position.timestamp.getTime()) / 60000;
    var atUpdateMinutesUntilMeeting = (meeting.start.getTime() - position.timestamp.getTime()) / 60000;
    var currentMinutesUntilMeeting = (meeting.start.getTime() - Date.now()) / 60000;

    var locationString = (distanceInMeters < 100) ? "<0.1" : (Math.floor(distanceInMeters / 100) / 10).toString();
    locationString += " km away at " + dateFormat(position.timestamp, "h:MM tt");


    if (minutesSinceUpdate > 30) {
        log.verbose("The assessment made was that the last position update was too long ago.");
        return { late: false, comfortable: false, message: "no position updates received within the last 30 minutes" };
    }

    var usingMaxRange = rangeReport(atUpdateMinutesUntilMeeting, distanceInMeters);
    var usingComfortableRange = rangeReport(atUpdateMinutesUntilMeeting - comfortableMinsEarly, distanceInMeters, comfortableSlack);

    log.verbose(position.email + "'s last reported position was " + distanceInMeters + " meters away from meeting at " + position.timestamp + "");

    if (usingMaxRange.canMake) {
        if (usingComfortableRange.canMake) {
            log.verbose("The assessment made was that the person can make the meeting.");
            return { late: false, comfortable: true, message: "on-time (" + locationString + ")", vehicleRequired: usingComfortableRange.requiredVehicle };
        }
        else {
            log.verbose("The assessment made was that the person may be cutting it close.");
            return { late: false, comfortable: false, message: "cutting it close (" + locationString + ")", vehicleRequired: usingMaxRange.requiredVehicle };
        }
    }
    else {
        log.verbose("The assessment made was that the person may be late.");
        return { late: true, comfortable: false, message: "stuck in traffic, will be late (" + locationString + ")", vehicleRequired: usingMaxRange.requiredVehicle };
    }
}

function rangeReport(minutesUntilMeeting, distance, slack) {
    function range(minutesUntilMeeting, fastestVehicle, slack) {
        if (!fastestVehicle)
            fastestVehicle = cumulativeMinutes.length - 1;

        var base = 0;
        for (var i = 0; i < cumulativeMinutes.length; i++) {
            if (minutesUntilMeeting >= cumulativeMinutes[i]) {
                base = i;
            }
        }
        if (base > fastestVehicle)
            base = fastestVehicle;

        var secondsPastBase = (minutesUntilMeeting - cumulativeMinutes[base]) * 60;
        var speed = speeds[base];
        var allowableDistance = cumulativeDistance[base] + (secondsPastBase * speed);
        return allowableDistance * slack;
    }

    function rangeByVehicle(minutesUntilMeeting, slack) {
        if (!slack)
            slack = 1.0;
        var ranges = [];
        for (var i = 0; i < vehicle.length; i++) {
            ranges[i] = range(minutesUntilMeeting, i, slack);
        }
        return ranges;
    }

    function vehicleRequired(ranges, distance) {
        var maxRange = 0;
        var maxRangeIndex = 0;
        for (var i = 0; i < ranges.length; i++) {
            if (ranges[i] > distance)
                return i;
            if (ranges[i] > maxRange) {
                maxRange = range[i];
                maxRangeIndex = i;
            }
        }
        return maxRangeIndex;
    }
    if (minutesUntilMeeting < 0)
        minutesUntilMeeting = 0;
    var vehicleRange = rangeByVehicle(minutesUntilMeeting, slack);
    var requiredVehicle = vehicleRequired(vehicleRange, distance);
    var canMake = vehicleRange[requiredVehicle] > distance;
    return {
        vehicleRange: vehicleRange,
        requiredVehicle: vehicle[requiredVehicle],
        canMake: canMake
    };
}

function evaluateForTravelPlan(meeting, person) {
    function getMessageForTravelMode(travelMode)
    {
        if (travelMode === "car")
            return "travelling by car";
        else if (travelMode === "walk")
            return "travelling by foot";
        else if (travelMode === "transit")
            return "travelling by public transport";
        else if (travelMode === "online")
            return "attending via video conference";
        else if (travelMode === "decline")
            return "unable to attend";
        else
            return "";
    }

    function formatDuration(minutesEarly)
    {
        var minutes = minutesEarly;
        var earlyOrLate = "early";
        if (minutes < 0)
        {
            earlyOrLate = "late";
            minutes = -minutes;
        }

        if (minutes === 0)
            return "just on-time";
        else if (minutes === 1)
            return "1 minute " + earlyOrLate;
        else
            return minutes + " minutes " + earlyOrLate;
    }

    var late = false;
    var comfortable = true;
    if (person.travelMode === "decline")
    {
        late = true;
        comfortable = false;
    }

    var message = getMessageForTravelMode(person.travelMode);
    if (person.travelEta)
    {
        var expectedMinutesEarly = (meeting.start.getTime() - person.travelEta.getTime()) / 60000;
        expectedMinutesEarly = Math.floor(expectedMinutesEarly);

        if (expectedMinutesEarly < comfortableMinsEarly)
            comfortable = false;
        if (expectedMinutesEarly < 0) 
            late = true;

        message += ", expected " + formatDuration(expectedMinutesEarly);
    }

    return {
        late: late,
        comfortable: comfortable,
        message: message
    };
}

exports.evaluateForPosition = evaluateForPosition;
exports.evaluateForTravelPlan = evaluateForTravelPlan;