/**
 * panel.js - The logic for the DevTools Panel
 */

let seen = new WeakSet();

const editor = document.getElementById('editor');
const dot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const refreshBtn = document.getElementById('refreshBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');

// 1. SETUP CONNECTION TO BACKGROUND RELAY
const tabId = chrome.devtools.inspectedWindow.tabId;
const backgroundConnection = chrome.runtime.connect({ name: "devtools-panel" });

// Initialize connection with tabId so background knows where to relay messages
backgroundConnection.postMessage({
  name: 'init',
  tabId: tabId
});

/**
 * FETCH INITIAL STATE
 * Pulls window.state from the inspected page context
 */
function fetchInitialState() {
  // We stringify it in the page context because we can't pass Proxies over the wire
  chrome.devtools.inspectedWindow.eval("window.__MRX_GET_DESIGNALIZED_STATE__()", (result, isException) => {
    if (!isException && result) {
      updateUI(result);
    } else if (isException) {
      console.error("Eval failed:", isException);
      statusText.textContent = "Error: state not found";
    }
  });
}

function updateUI(data) {
  dot.classList.add('connected');
  statusText.textContent = "Live Feed Connected";
  renderTree(data, editor, true);
}

function createToggle(onToggle) {
  const span = document.createElement('span');
  span.className = 'toggle';
  span.textContent = '▼';
  span.onclick = (e) => {
    e.stopPropagation();
    span.classList.toggle('rotated');
    onToggle();
  };
  return span;
}

function createIcon(text, onclick) {
  const el = document.createElement('span');
  el.className = 'icon';
  el.textContent = text;
  el.onclick = (e) => { e.stopPropagation(); onclick(); };
  return el;
}

function addControls(row, parentObj, key, isObject) {
  const controls = document.createElement('div');
  controls.className = 'controls';

  if (!isObject) {
    controls.appendChild(createIcon('✎', () => toggleEdit(row, parentObj, key)));
  }

  controls.appendChild(createIcon('+', () => {
    const target = parentObj[key];
    if (Array.isArray(target)) {
      const template = target[0] ? createDeepTemplate(target[0]) : "New Item";
      target.push(template);
    } else if (typeof target === 'object' && target !== null) {
      const newKey = prompt("Enter property name:");
      if (newKey) target[newKey] = "value";
    }
    refresh();
  }));

  controls.appendChild(createIcon('×', () => {
    const target = parentObj[key];
    if (Array.isArray(parentObj)) {
      parentObj.splice(key, 1);
    } else {
      delete parentObj[key];
    }
    refresh();
  }));

  row.appendChild(controls);
}

function toggleEdit(row, parentObj, key) {
  const valSpan = row.querySelector('.value');
  valSpan.contentEditable = true;
  valSpan.classList.add('editable');
  valSpan.focus();
  valSpan.onblur = () => {
    const newValue = valSpan.textContent.replace(/"/g, '');
    parentObj[key] = newValue;
    valSpan.contentEditable = false;
    valSpan.classList.remove('editable');
  };
}

function createDeepTemplate(source) {
  if (Array.isArray(source)) return source.length ? [createDeepTemplate(source[0])] : [];
  if (source && typeof source === 'object') {
    const template = {};
    for (let k in source) template[k] = createDeepTemplate(source[k]);
    return template;
  }
  if (typeof source === 'number') return 0;
  if (typeof source === 'boolean') return false;
  return "New Value";
}

export function renderTree(obj, container, isRoot = true) {
  if (!obj || typeof obj !== 'object') return;
  if (isRoot) {
    seen = new WeakSet();
    container.innerHTML = '';
  }

  if (seen.has(obj)) return;
  seen.add(obj);

  for (let key in obj) {
    if (['trackers','scheduler'].includes(key)) continue;

    const value = obj[key];
    const isArray = Array.isArray(value);
    const isObject = value && typeof value === 'object';

    const row = document.createElement('div');
    row.className = 'tree-row';

    let branchContainer = null;
    if (isObject || isArray) {
      branchContainer = document.createElement('div');
      branchContainer.className = 'tree-level collapsed';
      const toggle = createToggle(() => branchContainer.classList.toggle('collapsed'));
      toggle.classList.add('rotated');
      row.appendChild(toggle);
    } else {
      const spacer = document.createElement('span');
      spacer.style.width = '18px';
      row.appendChild(spacer);
    }

    const keySpan = document.createElement('span');
    keySpan.className = 'key';
    keySpan.textContent = Array.isArray(obj) ? `[${key}]:` : `${key}:`;
    row.appendChild(keySpan);

    if (!isObject && !isArray) {
      const valSpan = document.createElement('span');
      valSpan.className = 'value';
      valSpan.textContent = JSON.stringify(value);
      row.appendChild(valSpan);
    }

    container.appendChild(row);
    addControls(row, obj, key, isObject || isArray);

    if (branchContainer) {
      container.appendChild(branchContainer);
      renderTree(value, branchContainer, false);
    }
  }
}

// Event Listeners
refreshBtn.onclick = fetchInitialState;

collapseAllBtn.onclick = () => {
  chrome.devtools.inspectedWindow.eval("window.state.board.title.value", (result, isException) => {
    if (!isException) {
      console.log("Current window.state is :", result);
      alert("Check the console output for the current window.state output.");
    } else {
      console.error("Eval failed:", isException);
      alert("Error retrieving window.state. Check console for details.");
    }
  });
}

// Initial Pull
fetchInitialState();