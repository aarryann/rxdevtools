// background.js

const connections = {};

chrome.runtime.onConnect.addListener((port) => {
    const extensionListener = (message, sender, sendResponse) => {
        // The original connection request should include the tab ID
        if (message.name === 'init') {
            connections[message.tabId] = port;
            console.log("Registered connection for tab:", message.tabId);
            return;
        }
    };

    // Listen to messages from the DevTools Panel
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener((port) => {
        port.onMessage.removeListener(extensionListener);

        // Remove the connection from our tracking object
        const tabs = Object.keys(connections);
        for (let i = 0; i < tabs.length; i++) {
            if (connections[tabs[i]] === port) {
                delete connections[tabs[i]];
                break;
            }
        }
    });
});

// Listen for messages from the Content Script (the web page)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Messages from content scripts should have sender.tab set
    if (sender.tab) {
        const tabId = sender.tab.id;
        if (tabId in connections) {
            // Relay the message (STATE_UPDATED) to the specific DevTools Panel
            connections[tabId].postMessage(request);
        }
    }
    return true;
});