// extension/content/content.js

console.log('🔐 SuiPass content script loaded');

// Listen for window.postMessage from web app
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) {
    return;
  }
  
  // Check if it's from SuiPass web app - sync
  if (event.data.type === 'SUIPASS_SYNC' && event.data.source === 'suipass-webapp') {
    console.log('📨 Received sync message from web app:', event.data.passwords.length);
    
    // Forward to background service worker
    chrome.runtime.sendMessage({
      action: 'syncPasswords',
      passwords: event.data.passwords
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to forward to background:', chrome.runtime.lastError);
      } else {
        console.log('✅ Forwarded to background:', response);
        
        // Notify web app of success
        window.postMessage({
          type: 'SUIPASS_SYNC_SUCCESS',
          source: 'suipass-extension',
          count: event.data.passwords.length
        }, window.location.origin);
      }
    });
  }
  
  // Check if it's from SuiPass web app - clear
  if (event.data.type === 'SUIPASS_CLEAR' && event.data.source === 'suipass-webapp') {
    console.log('🗑️ Received clear message from web app');
    
    // Forward to background service worker
    chrome.runtime.sendMessage({
      action: 'clearPasswords'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to forward clear to background:', chrome.runtime.lastError);
      } else {
        console.log('✅ Forwarded clear to background:', response);
        
        // Notify web app of success
        window.postMessage({
          type: 'SUIPASS_CLEAR_SUCCESS',
          source: 'suipass-extension'
        }, window.location.origin);
      }
    });
  }
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillPassword') {
    fillPasswordFields(message.username, message.password);
    sendResponse({ success: true });
  } else if (message.action === 'showNotification') {
    showNotification(message.message);
    sendResponse({ success: true });
  }
  return true;
});

// Fill password into form fields
function fillPasswordFields(username, password) {
  try {
    // Find username/email field
    const usernameField = findUsernameField();
    if (usernameField) {
      setInputValue(usernameField, username);
    }
    
    // Find password field
    const passwordField = findPasswordField();
    if (passwordField) {
      setInputValue(passwordField, password);
    }
    
    // Show success notification
    showNotification('✅ Password filled successfully!');
  } catch (error) {
    console.error('Fill error:', error);
    showNotification('❌ Failed to fill password');
  }
}

// Find username/email field
function findUsernameField() {
  const selectors = [
    'input[type="email"]',
    'input[type="text"][name*="user"]',
    'input[type="text"][name*="email"]',
    'input[type="text"][id*="user"]',
    'input[type="text"][id*="email"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[id="username"]',
    'input[id="email"]',
    'input[autocomplete="username"]',
    'input[autocomplete="email"]'
  ];
  
  for (const selector of selectors) {
    const field = document.querySelector(selector);
    if (field && isVisible(field)) {
      return field;
    }
  }
  
  return null;
}

// Find password field
function findPasswordField() {
  const selectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[id="password"]',
    'input[autocomplete="current-password"]'
  ];
  
  for (const selector of selectors) {
    const field = document.querySelector(selector);
    if (field && isVisible(field)) {
      return field;
    }
  }
  
  return null;
}

// Check if element is visible
function isVisible(element) {
  return element.offsetWidth > 0 && 
         element.offsetHeight > 0 && 
         window.getComputedStyle(element).visibility !== 'hidden';
}

// Set input value (trigger events for React/Vue)
function setInputValue(input, value) {
  // Native setter
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  
  nativeInputValueSetter.call(input, value);
  
  // Trigger events for frameworks
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// Show notification
function showNotification(message) {
  // Remove existing notification
  const existing = document.getElementById('suipass-notification');
  if (existing) {
    existing.remove();
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.id = 'suipass-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1a1d29;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    animation: slideIn 0.3s ease;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Detect login forms on page load
function detectLoginForms() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  if (passwordFields.length > 0) {
    console.log('🔐 Login form detected');
  }
}

// Initialize
detectLoginForms();

// Watch for dynamic forms (SPAs)
const observer = new MutationObserver(() => {
  detectLoginForms();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});