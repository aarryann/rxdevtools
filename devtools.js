/**
 * devtools.js
 * This script runs as soon as the DevTools window is opened.
 */

chrome.devtools.panels.create(
    "microrx",             // Title of the tab
    "",              // Path to an icon (optional, can be null)
    "panel.html",              // The page to display inside the tab
    function(panel) {
        console.log("Microrx DevTools Panel Created.");
        
        // Optional: You can listen for when the user switches 
        // specifically to your panel tab
        panel.onShown.addListener(function(panelWindow) {
            // panelWindow is the 'window' object of panel.html
            console.log("User opened the Microrx tab");
        });
    }
);