var userPositions = [];

function location(request, response) {
    if (request.method !== 'POST')
        response.send(405); // Method not Allowed
    if (request.body.lat === undefined ||
        request.body.lng === undefined ||
        request.body.email === undefined) {
        response.send(400);
        return;
    }
    var email = request.body.email;
    var latitude = parseFloat(request.body.lat);
    var longitude = parseFloat(request.body.lng);

    if (isNaN(latitude) || isNaN(longitude) || email.length < 'a@a.eu'.length) {
        response.send(400);
        return;
    }
    console.log("[LOCATION] Logged " + email + " at " + latitude + "," + longitude + " (lat, long).");
    var userPosition = {
            email: email,
            latitude: latitude,
            longitude: longitude,
            lastUpdate: new Date()
        };
    setUserPosition(userPosition);
    response.send(200);
}

function setUserPosition(userPosition) {
    var email = userPosition.email;
    //userPositions[email] = userPosition; -- Avoiding this for reasons explained below.

    for (var i = 0; i < userPositions.length; i++) {
        if (userPositions[i].email === email) {
            userPositions[i] = userPosition;
            return;
        }
    }
    userPositions.splice(userPositions.length, 0, userPosition);
}

function getUserPosition(email) {
    //return userPositions[email]; -- Avoiding this; if someone's email is 'prototype' or 'constructor' or something reserved, this could cause undesired operation.

    for (var i = 0; i < userPositions.length; i++) {
        if (userPositions[i].email === email) {
            return userPositions[i];
        }
    }
}

exports.location = location;