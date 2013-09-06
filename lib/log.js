function create(source) {
    function log(text) {
        if (create.enabled)
            console.log("[" + source.toUpperCase() + "] " + text);
    }
    return log;
}
create.enabled = true;
exports = module.exports = create;