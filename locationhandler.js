function create(callback) {
    function handle(request, response) {
        if (request.method !== "POST") {
            response.send(405); // Method not Allowed
            callback(new Error("Invalid HTTP Method used."));
            return;
        }
        if (request.body.lat === undefined ||
            request.body.lng === undefined ||
            request.body.email === undefined) {

            response.send(400);
            callback(new Error("Invalid request body."));
            return;
        }
        var email = request.body.email;
        var latitude = parseFloat(request.body.lat);
        var longitude = parseFloat(request.body.lng);

        if (isNaN(latitude) || isNaN(longitude) || email.length < "a@a.eu".length) {

            response.send(400);
            callback(new Error("Invalid request data."));
            return;
        }
        var userPosition = {
            email: email,
            latitude: latitude,
            longitude: longitude,
            lastUpdate: new Date()
        };
        response.send(200);
        callback(undefined, userPosition);
    }
    return handle;
}
exports.create = create;