// content-script.js
window.addEventListener("message", (event) => {
  // Only relay messages from our framework
  if (event.data && event.data.type === 'STATE_UPDATED') {
    chrome.runtime.sendMessage(event.data);
  }
});