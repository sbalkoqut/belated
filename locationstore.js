

function create() {
    var userPositions = [];

    function setPosition(userPosition) {
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

    function getPosition(email) {
        //return userPositions[email]; -- Avoiding this; if someone's email is "prototype" or "constructor" or something reserved, this could cause undesired operation.

        for (var i = 0; i < userPositions.length; i++) {
            if (userPositions[i].email === email) {
                return userPositions[i];
            }
        }
    }

    return {
        setPosition: setPosition,
        getPosition: getPosition
    }
}
exports.create = create;