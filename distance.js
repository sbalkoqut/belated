var geoDistance = require("geo-distance-js");

var cumulativeMinutes = [0, 5, 20, 50];
var cumulativeDistance = [150, 743, 10751, 46335];
var speed = [1.976907, 11.1201, 19.76907, 148.2681];

function couldMake(meeting, position) {
    if (position === undefined)
        return { late: false, close: false, message: "This person has never used the Belated app." };

    var distanceInMeters = geoDistance.getDistance(meeting.latitude, meeting.longitude, position.latitude, position.longitude);

    var atUpdateMinutesUntilMeeting = (meeting.start.getTime() - position.lastUpdate.getTime()) / 60000;
    var currentMinutesUntilMeeting = (meeting.start.getTime() - Date.now()) / 60000;
    
    var atUpdateAllowableDistance = allowableDistance(atUpdateMinutesUntilMeeting);
    var currrentAllowableDistance = allowableDistance(currentMinutesUntilMeeting);

    console.log("[DISTANCE] " + position.email + "'s last reported position was " + distanceInMeters + " meters away from meeting at " + position.lastUpdate + ".");
    console.log("[DISTANCE] The permitted distance at update was " + atUpdateAllowableDistance + " meters.");
    console.log("[DISTANCE] The currently permitted distance is " + currrentAllowableDistance + " meters.");

    if (atUpdateMinutesUntilMeeting > 30) {
        console.log("[DISTANCE] The assessment made was that the last position update was too long ago for a judgement.");
        return { late: false, close: false, message: "No position updates received within the last 30 minutes." };
    }

    if (currrentAllowableDistance > distanceInMeters) {
        if (distanceInMeters < ((currrentAllowableDistance + 150) / 2)) {
            console.log("[DISTANCE] The assessment made was that the person should be comfortably at the meeting on time.");
            return { late: false, close: false,  message: "Comfortably expected to be at meeting on time." };
        }
        else {
            console.log("[DISTANCE] The assessment made was that the person should be at the meeting on time.");
            return { late: false, close: false, message: "Expected to be at meeting on time." };
        }
    }
    else if (atUpdateAllowableDistance > distanceInMeters) {
        console.log("[DISTANCE] The assessment made was that the person may be cutting it close.");
        return { late: false, close: true, message: "May be cutting it close." };
    }
    else {
        console.log("[DISTANCE] The assessment made was that the person may be late.");
        return { late: true, close: false, message: "Likely having trouble getting to the meeting on time." };
        // Running late.
    }
}

function allowableDistance(minutesUntilMeeting) {
    var base = 0;
    for (var i = 0; i < cumulativeMinutes.length; i++) {
        if (minutesUntilMeeting >= cumulativeMinutes[i]) {
            base = i;
        }
    }

    var secondsPastBase = (minutesUntilMeeting - cumulativeMinutes[base]) * 60;
    var allowableDistance = cumulativeDistance[base] + (secondsPastBase * speed[base]);
    return allowableDistance;
}

exports.couldMake = couldMake;