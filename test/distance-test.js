var assert = require("assert");
var distance = require("../lib/distance");
var inspect = require("util").inspect;
var log = require("../lib/log");
describe('distance', function () {
    before(function () {
        log.enabled = false;
    });
    after(function () {
        log.enabled = true;
    });

    var minute = 60 * 1000;

    it('should correctly detect the user is cutting it close (not late, but not comfortable) #1', function () {
        // Scenario: https://maps.google.com/maps?q=-27.469600,+153.020347+to+-27.468968,153.023499
        // Let's say they are walking. The directions state they will need 7 minutes to walk there, so they will arrive 3 minutes early.
        // However, they probably still need to walk into a building and so on they will likely just make it on time.
        var report = distance(
            { start: new Date(Date.now() + 9 * minute), latitude: -27.468968, longitude: 153.023499 },
            { email: "john.smith@gmail.com", latitude: -27.469600, longitude: 153.020347, timestamp: new Date(Date.now() - 1 * minute) });
        
        assert.strictEqual(report.late, false);
        assert.strictEqual(report.comfortable, false);
    });
    it('should correctly detect the user is late #1', function () {
        // Scenario: https://maps.google.com/maps?q=-27.469600,+153.020347+to+-27.468968,153.023499
        // Let's say the persion is using a car. Directions state 3 minutes to drive to meeting, and user is 3 min away.
        // However, even if they make it in the 3 minutes, they wouldn't have parked their car or walked into building. This means they'll be late.
        // If walking, directions state they need 7 minutes but only have 3. So late.
        var report = distance(
            { start: new Date(Date.now() + 2 * minute), latitude: -27.468968, longitude: 153.023499 },
            { email: "john.smith@gmail.com", latitude: -27.469600, longitude: 153.020347, timestamp: new Date(Date.now() - 1 * minute) });

        assert.strictEqual(report.late, true);
        assert.strictEqual(report.comfortable, false);
    });
    it('should correctly detect the user is comfortable #1', function () {
        // Scenario: https://maps.google.com/maps?q=-27.469600,+153.020347+to+-27.468968,153.023499
        // Let's say the person is walking. If this takes 7 minutes as per google maps, they will arrive 9 minutes early, which should be more than enough time.
        // They are therefore comfortably on time. Same can be said for if using car.
        var report = distance(
            { start: new Date(Date.now() + 15 * minute), latitude: -27.468968, longitude: 153.023499 },
            { email: "john.smith@gmail.com", latitude: -27.469600, longitude: 153.020347, timestamp: new Date(Date.now() - 1 * minute) });

        assert.strictEqual(report.late, false);
        assert.strictEqual(report.comfortable, true);
    });
}); 