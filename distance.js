var geoDistance = require("geo-distance-js");
var log = require("./log")("dist");

var cumulativeMinutes = [0, 5, 20, 50];
var cumulativeDistance = [100, 428, 7323, 34900];
var speeds = [1.094344, 7.660409, 15.32082, 87.54753];
var vehicle = ["walk", "car", "highway", "plane"];
var comfortableSlack = 0.7;
var comfortableMinsEarly = 5;
var dateFormat = require("dateformat");
function couldMake(meeting, position) {
    if (position === undefined)
        return { late: false, comfortable: true, message: "Not using Belated app." };

    var distanceInMeters = geoDistance.getDistance(meeting.latitude, meeting.longitude, position.latitude, position.longitude);

    var atUpdateMinutesUntilMeeting = (meeting.start.getTime() - position.lastUpdate.getTime()) / 60000;
    var currentMinutesUntilMeeting = (meeting.start.getTime() - Date.now()) / 60000;

    var locationString = (distanceInMeters < 100) ? "<0.1" : (Math.floor(distanceInMeters / 100) / 10).toString();
    locationString += " km away at " + dateFormat(position.lastUpdate, "h:MM tt");


    if (atUpdateMinutesUntilMeeting > 30) {
        log("The assessment made was that the last position update was too long ago for a judgement.");
        return { late: false, comfortable: false, message: "No position updates received within the last 30 minutes." };
    }

    var usingMaxRange = rangeReport(atUpdateMinutesUntilMeeting, distanceInMeters);
    var usingComfortableRange = rangeReport(atUpdateMinutesUntilMeeting - comfortableMinsEarly, distanceInMeters, comfortableSlack);

    log(position.email + "'s last reported position was " + distanceInMeters + " meters away from meeting at " + position.lastUpdate + ".");

    if (usingMaxRange.canMake) {
        if (usingComfortableRange.canMake) {
            log("The assessment made was that the person can make the meeting.");
            return { late: false, comfortable: true, message: " - On-time (" + locationString + ").", vehicleRequired: usingComfortableRange.requiredVehicle };
        }
        else {
            log("The assessment made was that the person may be cutting it close.");
            return { late: false, comfortable: false, message: " - Cutting it close (" + locationString + ").", vehicleRequired: usingMaxRange.requiredVehicle };
        }
    }
    else {
        log("The assessment made was that the person may be late.");
        return { late: true, comfortable: false, message: " - Stuck in traffic, will be late (" + locationString + ").", vehicleRequired: usingMaxRange.requiredVehicle };
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
exports.couldMake = couldMake;