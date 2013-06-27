var assert = require("assert");
var meetingStore = require("../meetingstore");

describe("meetingStore", function () {
    var store;
    // Sorted list of meetings by start time.
    var meetings = [{
        location: "Brisbane, Australia",
        latitude: 1.92,
        longitude: 192.3,
        start: new Date(Date.UTC(2013, 4, 23, 0, 30, 0, 0)),
        end: new Date(Date.UTC(2013, 4, 23, 1, 0, 0, 0)),
        organiser: {
            name: "Pierre Curie",
            email: "pierre.curie@live.com"
        },
        attendees: [{
            name: "John Smith",
            email: "johnny.smith@gmail.com"
        }],
        subject: "Meeting Subject",
        description: "Meeting body.\n",
        emailId: "<BLU401-EAS404DE843EABFACD74383473288F1@phx.gbl>"
    }, {
        location: "Sydney, Australia",
        latitude: -81.3,
        longitude: -50.1,
        start: new Date(Date.UTC(2013, 5, 23, 10, 30, 0, 0)),
        end: new Date(Date.UTC(2013, 5, 23, 11, 0, 0, 0)),
        organiser: {
            name: "Sophie Alexandera",
            email: "sophiealexandra@random.us"
        },
        attendees: [{
            name: "Wolfgang Apfelbaum",
            email: "wolfgang.apfelbaum@web.de"
        }],
        subject: "Picnic",
        description: "Formal invitation to a casual picnic with dog.\n",
        emailId: "<BLU401-EAS404DE843EABFACD74383473288F0@phx.gbl>"
    }];

    describe("#add", function () {
        beforeEach(function () {
            store = meetingStore();
        });

        it("should add and delete a meeting successfully", function () {
            var meeting = meetings[0];
            store.add(meeting);

            var result = store.getMeetingsWithin(meeting.start, meeting.start);
            assert.deepEqual(result, [meeting], "the meeting should be accessible via #getMeetingsWithin");

            store.remove(meeting);
            result = store.getMeetingsWithin(meeting.start, meeting.start);
            assert.deepEqual(result, [], "the meeting should no longer be accessible via #getMeetingsWithin after deletion");
        });
      
        it("should add multiple meetings successfully", function () {
            for (var i = 0; i < meetings.length; i++) {
                store.add(meetings[i]);
            }
            for (var i = 0; i < meetings.length; i++) {
                var result = store.getMeetingsWithin(meetings[i].start, meetings[i].start);
                assert.deepEqual(result, [meetings[i]], "the meeting should be accessible via #getMeetingsWithin");
            }
            var all = store.getMeetingsWithin(meetings[0].start, meetings[meetings.length-1].start);
            assert.deepEqual(all, meetings, "all meetings should be accessible in order via #getMeetingsWithin");

            for (var i = 0; i < meetings.length; i++) {
                store.remove(meetings[i]);

                var result = store.getMeetingsWithin(meetings[i].start, meetings[i].start);
                assert.deepEqual(result, [], "the meeting should not be accessible via #getMeetingsWithin");
            }
            all = store.getMeetingsWithin(meetings[0].start, meetings[meetings.length - 1].start);
            assert.deepEqual(all, [], "all meetings should no longer be accessible in order via #getMeetingsWithin");

        });
        it("should add multiple meetings successfully", function () {
            for (var i = meetings.length - 1; i >= 0; i--) {
                store.add(meetings[i]);
            }
            for (var i = 0; i < meetings.length; i++) {
                var result = store.getMeetingsWithin(meetings[i].start, meetings[i].start);
                assert.deepEqual(result, [meetings[i]], "the meeting should be accessible via #getMeetingsWithin");
            }
            var all = store.getMeetingsWithin(meetings[0].start, meetings[meetings.length - 1].start);
            assert.deepEqual(all, meetings, "all meetings should be accessible in order via #getMeetingsWithin");

        });

        afterEach(function () {
            store = undefined;
        });
    });


    describe("#getMeetingsWithin", function () {
        beforeEach(function () {
            store = meetingStore();
        });
        it("should return an empty array of meetings for any valid timespan when none have been added", function () {
           
            var result = store.getMeetingsWithin(new Date(Date.UTC(2000, 0, 0, 0, 0, 0, 0)),
                new Date(Date.UTC(2200, 0, 0, 0, 0, 0, 0)));
            assert.deepEqual(result, []);
        });

        it("should return an empty array of meetings for any valid timespan where no meetings have been added for", function () {
            var result = store.getMeetingsWithin(new Date(meetings[0].start.getTime() + 1),
                new Date(meetings[1].start.getTime() - 1));
            assert.deepEqual(result, []);
        });
        afterEach(function () {
            store = undefined;
        });

    });
});