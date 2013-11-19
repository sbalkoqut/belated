var emailClient = require("../lib/emailclient"); // Load Node Assert module
var assert = require("assert");
var log = require("../lib/log")
var mockery = require("mockery");
var nodemock = require("nodemock");

describe("emailClient", function () {
    before(function () {
        log.enabled = false;
    });
    after(function () {
        log.enabled = true;
    });

    describe("#listen()", function () {

        var emailReceivedCount;
        var emailSentCount;
        var unreadEmails;

        var correctHeaders;
        var imapConnection;
        var onMail;
        var onClose;

        beforeEach(function () {

            emailReceivedCount = 0;
            emailSentCount = 0;

            unreadEmails = [];

            correctHeaders = { subject: "RE: Test Subject", to: "john.smith@gmail.com" };
            imapConnection = {
                on: function (event, handler) {
                    if (event === "mail") {
                        onMail = handler;
                    }
                    else if (event === "close") {
                        onClose = handler;
                    }
                },
                connect: function (onConnect) {

                    onConnect(undefined);
                },
                openBox: function (boxName, readOnly, onOpen) {
                    validateOpenBoxParameters(boxName, readOnly, onOpen);

                    onOpen(undefined);
                },
                search: function (criteria, onSearchComplete) {
                    validateSearchParameters(criteria, onSearchComplete);

                    onSearchComplete(undefined, unreadEmails);
                },
                fetch: function (items, options, request, onFetchComplete) {
                    validateFetchParameters(items, options, request, onFetchComplete);

                    assert.deepEqual(items, unreadEmails, "The items to fetch must the same as those returned by the search.");

                    if (items.length > 0) {
                        emulateFetch(items, options, request, correctHeaders);
                    }
                    onFetchComplete();
                }
            };
        });

        function validateOpenBoxParameters(boxName, readOnly, onOpen) {
            assert.strictEqual(boxName, "INBOX", "Incorrect box was requested to be opened.");
            assert(readOnly == false, "Inbox should not be opened in read-only mode.");
        }

        function validateSearchParameters(criteria, onSearchComplete) {
            assert(criteria, "A search criteria must be specified");
            assert.strictEqual(criteria.length, 1, "The search criteria should only have one item.");
            assert.strictEqual(criteria[0], "UNSEEN", "The search criteria should include 'unseen' (items).");
        }

        function validateFetchHeaderFields(headers) {
            assert(Array.isArray(headers), "The headers to fetch should be an array.");

            var headersContainsSubject = false;
            for (var i = 0; i < headers.length; i++) {
                assert.strictEqual(typeof headers[i], "string", "The individal headers to fetch should be strings.");
                if (headers[i].toLowerCase() == "subject") {
                    headersContainSubject = true;
                    break;
                }
            }
            assert(headersContainSubject, "The headers to fetch should include 'subject'.");
        }

        function validateFetchParameters(items, options, request, callback) {
            assert(Array.isArray(items), "The items to fetch should be an array.");

            // Arguement detection. Options parameter optional.
            if (!callback) {
                request = options;
                callback = request;
            }
            assert(request, "The fetch request must be specified.");
            assert(request.cb, "The fetch request must have a callback.");
            assert(request.body, "The fetch request should ask for the body.");
            assert(request.headers, "The headers to fetch must be specified.");

            assert.strictEqual(typeof request.headers, "object", "The headers to fetch must be an object.");
            assert.strictEqual(request.headers.parse, true, "The code should ask for headers to be parsed.");

            validateFetchHeaderFields(request.headers.fields);
           
        }

        function emulateFetch(items, options, request, correctHeaders) {
            request.cb(
            {
                on: function (event, messageFetchStartHandler) {
                    assert.strictEqual(event, "message", "The only event on the ImapFetch object that should be registered for is the 'message' event.");

                    var itemIndex = 0;
                    var header = null;
                    var data = null;
                    var end = null;

                    var imapMessage = {
                        on: function (event, handler) {
                            if (event === "headers") {
                                header = handler;
                            }
                            else if (event === "data") {
                                data = handler;
                            }
                            else if (event === "end") {
                                end = handler;
                            }
                            else {
                                assert.fail(event, undefined, "The only events on the ImapMesage object that may be registered for are 'headers', 'data' or 'end'.");
                            }

                            // Once all events have been hooked onto.
                            if (end && data && header) {
                                header(correctHeaders);
                                data(items[itemIndex].toString() + ":");
                                data("Hello There! ");
                                data("How are you?");
                                end();

                                itemIndex++;
                                if (itemIndex < items.length) {
                                    header = null;
                                    data = null;
                                    end = null;
                                    imapMessage.seqno = items[itemIndex];
                                    messageFetchStartHandler(imapMessage);
                                }
                            }
                        },
                        seqno: items[itemIndex]
                    };

                    messageFetchStartHandler(imapMessage);

                }
            });
        }

        function sendEmail(email) {
            emailSentCount = email.length;
            emailReceivedCount = 0;
            unreadEmails = email;
        }

        function receivedEmail(testHeaders, testBody) {
            assert.deepEqual(testHeaders, correctHeaders, "The same headers returned by the IMAP module were not provided in the new email callback.");
            assert.deepEqual(testBody, unreadEmails[emailReceivedCount].toString() + ":Hello There! How are you?", "The same body returned by the IMAP module were not provided in the new email callback.");

            emailReceivedCount += 1;
        }

        function hasReceivedAllEmail() {
            return emailReceivedCount == emailSentCount;
        }

        it.skip('should notify about existing new emails after start', function (done) {

            sendEmail([142, 182, 1232]);

            emailClient(imapConnection, function (headers, body) {
                receivedEmail(headers, body);
                if (hasReceivedAllEmail())
                    done();
            });

        })
        it.skip('should notify about new emails upon arrival', function (done) {

            emailClient(imapConnection, function (headers, body) {
                assert(emailSentCount > 0, "A call was made to the new email callback when there was no actual email available.");

                receivedEmail(headers, body);
                if (hasReceivedAllEmail())
                    done();
            });

            sendEmail([123, 789]);

            onMail(emailSentCount);
        })
    })
});