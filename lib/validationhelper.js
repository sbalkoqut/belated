var utils = require("./utils");

exports.email = function (email) {
    if (!utils.isString(email))
        return false;

    var validEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return email.match(validEmail);
};

exports.travel = function (mode, eta) {
    var modesWithETA = ["walk", "car", "transit"];
    var modesWithoutETA = ["online", "decline", "unspecified"];

    if (!utils.isString(mode))
        return false;
    if (modesWithETA.indexOf(mode) >= 0)
        return utils.isDate(eta);
    if (modesWithoutETA.indexOf(mode) >= 0)
        return (eta === null);
};