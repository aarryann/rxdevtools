/**
 * panel.js - The logic for the DevTools Panel
 */

let jsonData = {};
let isConnected = false;

const editor = document.getElementById('editor');
const dot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const refreshBtn = document.getElementById('refreshBtn');
const stateBtn = document.getElementById('stateBtn');

// 1. SETUP CONNECTION TO BACKGROUND RELAY
const tabId = chrome.devtools.inspectedWindow.tabId;
const backgroundConnection = chrome.runtime.connect({ name: "devtools-panel" });

// Initialize connection with tabId so background knows where to relay messages
backgroundConnection.postMessage({
  name: 'init',
  tabId: tabId
});

// Listen for STATE_UPDATED messages relayed from the Content Script via Background
backgroundConnection.onMessage.addListener((message) => {
  if (message.type === 'STATE_UPDATED') {
    updateUI(message.payload);
  }
});

/**
 * FETCH INITIAL STATE
 * Pulls window.state from the inspected page context
 */
function fetchInitialState() {
  // We stringify it in the page context because we can't pass Proxies over the wire
  chrome.devtools.inspectedWindow.eval("window.state", (result, isException) => {
    if (!isException && result) {
      updateUI(result);
    } else if (isException) {
      console.error("Eval failed:", isException);
      statusText.textContent = "Error: state not found";
    }
  });
}

function updateUI(data) {
  jsonData = data;
  isConnected = true;
  dot.classList.add('connected');
  statusText.textContent = "Live Feed Connected";
  renderTree(jsonData, editor);
}

/**
 * TREE RENDERING ENGINE
 */
function renderTree(obj, container) {
  container.innerHTML = '';
  if (!obj) return;

  for (let key in obj) {
    const value = obj[key];
    const row = document.createElement('div');
    row.className = 'tree-row';

    const isCollapsible = typeof value === 'object' && value !== null;
    
    if (isCollapsible) {
      const branchContainer = document.createElement('div');
      branchContainer.className = 'tree-level';
      
      // Create the arrow toggle
      const toggle = document.createElement('span');
      toggle.className = 'toggle';
      toggle.textContent = '▼';
      toggle.onclick = () => {
        toggle.classList.toggle('rotated');
        branchContainer.classList.toggle('collapsed');
      };
      
      row.appendChild(toggle);
      row.appendChild(createSpan('key', Array.isArray(obj) ? `[${key}]:` : `${key}:`));
      container.appendChild(row);
      
      renderTree(value, branchContainer);
      container.appendChild(branchContainer);
    } else {
      // Leaf node (primitive value)
      const spacer = document.createElement('span');
      spacer.style.width = '18px'; 
      row.appendChild(spacer);
      
      row.appendChild(createSpan('key', Array.isArray(obj) ? `[${key}]:` : `${key}:`));
      row.appendChild(createSpan('value', `"${value}"`));
      container.appendChild(row);
    }
  }
}

function createSpan(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

// Event Listeners
refreshBtn.onclick = fetchInitialState;

stateBtn.onclick = () => {
  chrome.devtools.inspectedWindow.eval("window.state.board.title.value", (result, isException) => {
    if (!isException) {
      console.log("Current window.state:", result);
      alert("Check the console for the current window.state output.");
    } else {
      console.error("Eval failed:", isException);
      alert("Error retrieving window.state. Check console for details.");
    }
  });
}

// Initial Pull
fetchInitialState();