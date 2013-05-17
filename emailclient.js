var imap = require('imap');             // Load the IMAP client module ( https://npmjs.org/package/imap )
var inspect = require('util').inspect;  // 


function initialise(configuration, newMessageCallback) {
	/// <summary>
    /// Initialises the IMAP server.
	/// </summary>
    /// <param name="configuration">The configuration for the imap server connection.</param>

    var imapConnection;
    var running = false;
    var busyConnecting = false; // Prevents duplicate connection attempts.
    var reconnecting = false;
    var imapBoxName;

   
    // Register our event listeners
    imapConnection.on('mail', checkMail);
    imapConnection.on('close', connectionLost);
    
    // Indicate we are running.
    running = true;

    imapBoxName = "INBOX";

    // Try to connect.
    attemptConnect(false);
    
    function connected(error) {
        /// <summary>
        /// Starts opening the mailbox to check for email. Called once we have connected to the server, or if we are already connected, immediately. 
        /// </summary>
        /// <param name="error">The error connecting to the server.</param>

        // We are not attempting to connect anymore.
        busyConnecting = false;

        // Handle any errors connecting. 
        // N.B: No need  to call logout, socket is immediately destroyed.
        if (error) {
            console.log("[IMAP] An error occured connecting.");

            // We don't need to handle the error if we aren't running.
            if (running) {
                // Try to reconnect again.
                connectionLost(true);
                return;
            }
        }

        // If we aren't supposed to be connected and running anymore.
        if (!running) {

            console.log("[IMAP] Stopped.");

            // If there wasn't an error, we are safe to log out.
            if (!error) {
                imapConnection.logout(loggedOut);
            }
            return;
        }

        console.log("[IMAP] Connected.");

        try {
            // Open the specified mailbox in non-read only mode.
            imapConnection.openBox(imapBoxName, false, boxOpened);
        }
        catch (e) {
            console.log(e);
        }
    }

    function boxOpened(error, mailbox) {
        /// <summary>
        /// Called once the mailbox has been opened.
        /// </summary>
        /// <param name="error">Any errors encountered whilst opening the mailbox.</param>
        /// <param name="mailbox">The opened mailbox.</param>

        // Handle any errors opening the mailbox.
        if (error) {
            console.log("[IMAP] An error occured opening mailbox: " + error);

            // Try to reconnect again.
            connectionLost(true);
            return;
        }

        // Now that we have opened the mailbox for the first time since connecting, check the mailbox.
        // We don't know how many mail messages have been received, so just say 0.
        checkMail(0);
    }

    function checkMail(numMessages) {
        /// <summary>
        /// Called when new email is received.
        /// </summary>
        /// <param name="numMessages">The number of email messages received.</param>

        if (numMessages == 0) {
            console.log("[IMAP] Doing initial check for email.");
        } else {
            console.log("[IMAP] " + numMessages.toString() + " emails have become available.");
        }


        // Retreive all unread messages.
        imapConnection.search(['UNSEEN'], searchCompleted);
    }

    function searchCompleted(error, results) {
        /// <summary>
        /// Called once a mailbox search has completed.
        /// </summary>
        /// <param name="error">Any errors encountered whilst searching.</param>
        /// <param name="results">An array of UIDs representing the email messages that matched the search query.</param>

        // If there was an error.
        if (error) {
            console.log("[IMAP] An error occured searching the mailbox for new mail.");

            // Try to reconnect again.
            connectionLost(true);
            return;
        }

        // Determine the number of unread emails.
        var itemsFound = (results == null) ? 0 : results.length;

        // Report the number found
        console.log("[IMAP] " + itemsFound.toString() + " items were found.");

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
                      fields: ["from", "to", "subject", "date"], // Alternatively, use 'true' to get all headers.
                      parse: true
                  },
                body: true,
                cb: messagesFetching
            },
            messageRetreivalCompleted);
    }

    function messagesFetching(imapFetch) {
        /// <summary>
        /// Called once a messages are being fetched.
        /// </summary>
        /// <param name="fetchedMail">An ImapFetch object representing the fetched email.</param>
        console.log("[IMAP] Items are being fetched.");

        imapFetch.on("message", messageFetching);
    }

    function messageFetching(message) {
        console.log("[IMAP] Message #" + message.seqno + " is being fetched.");
        message.on("headers", headersFetched);
        message.on("data", dataFetched);
        message.on("end", endFetch);
    }

    function headersFetched(headers) {
        console.log("[IMAP] Fetched message headers, " + inspect(headers));
    }

    function dataFetched(data) {
        console.log("[IMAP] Fetched a message part.");
    }

    function endFetch() {
        console.log("[IMAP] Finished fetching message.");
    }

    function messageRetreivalCompleted(error) {
        // If there was an error.
        if (error) {
            console.log("[IMAP] An error occured retreiving messages.");

            // Try to reconnect again.
            connectionLost(true);
            return;
        }
    }

    function connectionLost(hadError) {
        /// <summary>
        /// Called whenever the connection to the IMAP server was lost, or an unexpected error occured meaning that we must reconnect.
        /// </summary>
        /// <param name="hadError">Wether the connection was lost due to an error (unused).</param>

        // If we are not supposed to be running, do nothing.
        if (!running)
            return;

        // If we aren't currently trying to reconnect.
        if (!busyConnecting && !reconnecting) {

            console.log("[IMAP] Connection lost. Attempting reconnect in 5 seconds.");

            // Schedule to reconnect in 5 seconds.
            reconnecting = true;
            setTimeout(attemptConnect, 5000, true);
        }
    }

    function attemptConnect(isReconnecting) {
        /// <summary>
        /// Attempts to connect to the IMAP server, if not already busy doing so.
        /// </summary>
        /// <param name="isReconnecting">Wether we are reconnecting or connecting for the first time.</param>

        // If we are not (no longer) attempting to reconnect, or we are already connecting.
        if (!running || busyConnecting)
            // Do nothing.
            return;

        // If we were reconnecting
        if (isReconnecting)
            reconnecting = false;   // Save that we aren't waiting to reconnect anymore.

        console.log("[IMAP] Connecting...");

        // Try to connect.
        busyConnecting = true;  // Save that we are currently in the process of connecting.
        try {
            imapConnection.connect(connected);
        }
        catch (e) {
            console.log(e);
        }
    }

    function stop() {
        /// <summary>
        /// Stops the IMAP email client from running, if it is running.
        /// </summary>

        // If we are not running, do nothing.
        if (!running)
            return;

        // Set our state to be not running.
        running = false;


        // Remove any listers for new mail and lost connection.
        imapConnection.removeListener('mail', checkMail);
        imapConnection.removeListener('close', connectionLost);


        // If we are currently logged in, log out. 
        // If we are in the process of logging in, the log out will occur later as the connected method realises it is not supposed to be connected.
        if (imapConnection.connected) {
            imapConnection.logout(loggedOut);
        }

        // If we aren't busy connecting, we can say we have indeed stopped the IMAP client. 
        if (!busyConnecting)
            console.log("[IMAP] Stopped.");

    }

    function loggedOut(error) {
        /// <summary>
        /// Called whenever we are logged out of the IMAP server.
        /// </summary>
        /// <param name="error">The error that led to this, if any.</param>

        var reason = (error) ? "Expected log out." : error.toString();

        console.log("[IMAP] Logged out. Reason: " + reason);
    }

    // Initialise our imap connection.
    imapConnection = new imap(configuration);

    return {
        start: start,
        stop: stop
    };
}


exports.initialise = initialise;