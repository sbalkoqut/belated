var imap = require('imap');             // Load the IMAP client module ( https://npmjs.org/package/imap )
var inspect = require('util').inspect;  // 

var imapConnection;

var running = false;
var busyConnecting = false; // Prevents duplicate connection attempts.
var reconnecting = false;
var imapBoxName;

function initialise(configuration) {
	/// <summary>
    /// Initialises the IMAP server.
	/// </summary>
    /// <param name="configuration">The configuration for the imap server connection.</param>

    // Initialise our imap connection.
    imapConnection = new imap(configuration);
}

function start(boxName, newMessageCallback) {
	/// <summary>
    /// Listens for new messages at the server, and performs a callback for each new message received.
	/// </summary>
	/// <param name="boxName">The name of the box to open. For example, 'All Mail'</param>
	/// <param name="newMessageCallback">The function to be executed for each new message found at the server.</param>


    

    

    // If we are running and connected, do nothing.
    if (running && imapConnection.connected)
        return;

    // If we aren't currently running
    if (!running) {
        // Register our event listeners
        imapConnection.on('mail', checkMail);
        imapConnection.on('close', connectionLost);

        // Indicate we are running.
        running = true;
    }
    imapBoxName = boxName;
    
    // Try to connect.
    attemptConnect(false);
}

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

    try{
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

    // If there are no results
    if (!results || results.length == 0) {
        // Do nothing.
        return;
    }
    console.log("[IMAP] " + results.length + " items were found.");

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
                  fields: ['from', 'to', 'subject', 'date'], // Alternatively, use 'true' to get all headers.
                  parse: true
              },
            body: true,
            cb: messageRetreived
        },
        messageRetreivalCompleted);
}

function messageRetreived(fetchedMail, parameter) {
    /// <summary>
    /// Called once a message has been retreived.
    /// </summary>
    /// <param name="fetchedMail">An ImapFetch object representing the fetched email.</param>
    /// <param name="parameter"></param>
    console.log("[IMAP] An item was retreived.");
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
    try
    {
        imapConnection.connect(connected);
    }
    catch (e)
    {
        console.log(e);
    }
}

function stop() {
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
    console.log("[IMAP] Logged out.");
}
exports.initialise = initialise;
exports.start = start;
exports.stop = stop;