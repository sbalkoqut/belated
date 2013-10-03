exports.isString = function (value) {
    return (value !== undefined && (typeof (value) === "string"));
};
exports.isNumber = function (value) {
    return (value !== undefined && (typeof (value) === "number"));
};
exports.isDate = function (value) {
    return (value !== undefined && (value instanceof Date));
};
exports.isObject = function (value) {
    return (value !== undefined && (typeof (value) === "object"));
};
exports.isArray = function (value) {
    return (value !== undefined && Array.isArray(value));
};
exports.isFunction = function (value) {
    return (value !== undefined && (typeof (value) === "function"));
};
exports.isBoolean = function (value) {
    return (value !== undefined && (typeof (value) === "boolean"));
}

