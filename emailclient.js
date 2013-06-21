var log = require("./log")("imap");

function listen(imapConnection, newMessageCallback) {
	/// <summary>
    /// Initialises the IMAP server, and starts listening for new email.
    /// </summary>
    /// <param name="imap">The IMAP library to use, https://npmjs.org/package/imap or equivalent</param>
    /// <param name="configuration">The configuration for the imap server connection.</param>
    /// <param name="newMessageCallback">The method that is called for each newly received message.</param>

    // Initialise our imap connection.
    //var imapConnection = new imap(configuration);

    var busyConnecting = false; // Prevents duplicate connection attempts.
    var reconnecting = false;
    var imapBoxName = "INBOX";

    // Register our event listeners
    imapConnection.on('mail', mailAvailable);
    imapConnection.on('close', reconnect);

    // Try to connect.
    connect();
    
    function onConnect(error) {
        /// <summary>
        /// Starts opening the mailbox to check for email. Called once we have connected to the server, or if we are already connected, immediately. 
        /// </summary>
        /// <param name="error">The error connecting to the server.</param>

        // We are not attempting to connect anymore.
        busyConnecting = false;

        // Handle any errors connecting. 
        // N.B: No need  to call logout, socket is immediately destroyed.
        if (error) {
            log("An error occured connecting.");

            // Try to reconnect again.
            reconnect(true);
            return;
        }

        log("Connected.");

        try {
            // Open the specified mailbox in non-read only mode.
            imapConnection.openBox(imapBoxName, false, onBoxOpen);
        }
        catch (e) {
            log(e);
        }
    }

    function onBoxOpen(error, mailbox) {
        /// <summary>
        /// Called once the mailbox has been opened.
        /// </summary>
        /// <param name="error">Any errors encountered whilst opening the mailbox.</param>
        /// <param name="mailbox">The opened mailbox.</param>

        // Handle any errors opening the mailbox.
        if (error) {
            log("An error occured opening mailbox: " + error);

            // Try to reconnect again.
            reconnect(true);
            return;
        }


        // Now that we have opened the mailbox for the first time since connecting, check the mailbox.
        checkMail();
    }

    function mailAvailable(numberOfMessages) {

        checkMail();
    }

    function checkMail() {
        /// <summary>
        /// Checks for new email.
        /// </summary>

        // Retreive all unread messages.
        imapConnection.search(['UNSEEN'], onMailChecked);
    }

    function onMailChecked(error, results) {
        /// <summary>
        /// Called once a mailbox search has completed.
        /// </summary>
        /// <param name="error">Any errors encountered whilst searching.</param>
        /// <param name="results">An array of UIDs representing the email messages that matched the search query.</param>

        // If there was an error.
        if (error) {
            log("An error occured searching the mailbox for new mail.");

            // Try to reconnect again.
            reconnect(true);
            return;
        }

        // Determine the number of unread emails.
        var itemsFound = (results == null) ? 0 : results.length;

        // Report the number found
        log(itemsFound.toString() + " items are available.");

        // If there are no results
        if (itemsFound == 0) {
            // Do nothing.
            return;
        }

        // Whilst we could go and fetch each email message in the results individually, let's just get all the email messages.
        imapConnection.fetch(results,
            {
                markSeen: true,
                struct: false,
                size: false
            },
            {
                headers:
                  {
                      fields: ["from", "to", "subject", "date", "message-id"], // Alternatively, use 'true' to get all headers.
                      parse: true
                  },
                body: true,
                cb: onFetchingMessages
            },
            onAllMessagesFetched);
    }

    function onFetchingMessages(imapFetch) {
        /// <summary>
        /// Called once messages are being fetched.
        /// </summary>
        /// <param name="fetchedMail">An ImapFetch object representing the fetched email.</param>

        log("Items are being fetched.");

        // As each message is fetched.
        imapFetch.on("message", fetchingMessage);
    }

    function fetchingMessage(message) {
        var messageHeaders;
        var messageBody = "";

        function addMessageHeaders(headers) {
            messageHeaders = headers;
        }
        function addMessageData(chunk) {
            messageBody += chunk;
        }

        function finaliseMessage() {
            log("Finished fetching message #" + message.seqno + ".");
            newMessageCallback(messageHeaders, messageBody);
        }

        log("Message #" + message.seqno + " is being fetched.");
        message.on("headers", addMessageHeaders);
        message.on("data", addMessageData);
        message.on("end", finaliseMessage);
    }


    function onAllMessagesFetched(error) {
    	/// <summary>
    	/// Called once all messages have been fetched.
    	/// </summary>
    	/// <param name="error">The error occured fetching messages.</param>

        // If there was an error.
        if (error) {
            log("An error occured retreiving messages.");

            // Try to reconnect again.
            reconnect(true);
            return;
        }
    }

    function reconnect(hadError) {
        /// <summary>
        /// Called whenever the connection to the IMAP server was lost, or an unexpected error occured meaning that we must reconnect.
        /// </summary>
        /// <param name="hadError">Wether the connection was lost due to an error (unused).</param>

        // If we aren't currently trying to reconnect.
        if (!busyConnecting && !reconnecting) {

            log("Connection lost. Attempting reconnect in 5 seconds.");

            // Schedule to reconnect in 5 seconds.
            reconnecting = true;
            setTimeout(function () {
                reconnecting = false;
                connect();
            }, 5000, true);
        }
    }

    function connect() {
        /// <summary>
        /// Attempts to connect to the IMAP server, if not already busy doing so.
        /// </summary>
        /// <param name="isReconnecting">Wether we are reconnecting, or connecting for the first time.</param>

        // If we are not (no longer) attempting to reconnect, or we are already connecting.
        if (busyConnecting)
            // Do nothing.
            return;

        log("Connecting...");

        // Try to connect.
        busyConnecting = true;  // Save that we are currently in the process of connecting.
        
        imapConnection.connect(onConnect);
    }

    function onLogout(error) {
        /// <summary>
        /// Called whenever we are logged out of the IMAP server.
        /// </summary>
        /// <param name="error">The error that led to this, if any.</param>

        var reason = (error) ? "Expected log out." : error.toString();

        log("Logged out. Reason: " + reason);
    }
}


exports.listen = listen;