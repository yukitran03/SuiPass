// extension/background/service-worker.js

console.log('🔐 SuiPass extension loaded');

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'suipass-fill',
    title: 'Fill password from SuiPass',
    contexts: ['editable']
  });
  
  console.log('✅ Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'suipass-fill') {
    try {
      // Get current site
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      // Get passwords from storage
      const result = await chrome.storage.local.get(['passwords']);
      const passwords = result.passwords || [];
      
      console.log(`🔍 Found ${passwords.length} passwords in storage`);
      
      // Find matching password for current site
      const match = passwords.find(entry => {
        const entryDomain = entry.url ? new URL(entry.url).hostname : entry.site;
        return domain.includes(entryDomain) || entryDomain.includes(domain);
      });
      
      if (match) {
        console.log('✅ Found matching password for', domain);
        // Send to content script
        chrome.tabs.sendMessage(tab.id, {
          action: 'fillPassword',
          username: match.username,
          password: match.password
        });
      } else {
        console.log('❌ No matching password for', domain);
        // No match found
        chrome.tabs.sendMessage(tab.id, {
          action: 'showNotification',
          message: 'No password found for this site'
        });
      }
    } catch (error) {
      console.error('❌ Context menu error:', error);
    }
  }
});

// Listen for messages from content script (INTERNAL messages)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Received message:', message);
  console.log('📨 From sender:', sender);
  
  if (message.action === 'syncPasswords') {
    console.log(`💾 Syncing ${message.passwords.length} passwords to storage...`);
    
    // Save to chrome.storage.local
    chrome.storage.local.set({ passwords: message.passwords }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Passwords saved to storage successfully!');
        console.log(`📊 Total passwords: ${message.passwords.length}`);
        sendResponse({ success: true, count: message.passwords.length });
      }
    });
    
    // CRITICAL: Return true to keep message channel open for async response
    return true;
  }
  
  if (message.action === 'clearPasswords') {
    console.log('🗑️ Clearing passwords from storage...');
    
    // Clear from chrome.storage.local
    chrome.storage.local.set({ passwords: [] }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Passwords cleared from storage!');
        sendResponse({ success: true, count: 0 });
      }
    });
    
    return true;
  }
  
  // Unknown action
  console.warn('⚠️ Unknown action:', message.action);
  sendResponse({ success: false, error: 'Unknown action' });
});

// BACKUP: Also listen for external messages (if direct messaging works)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('📨 Received EXTERNAL message:', message);
  console.log('📨 From sender:', sender);
  
  if (message.action === 'syncPasswords') {
    console.log(`💾 Syncing ${message.passwords.length} passwords (external)...`);
    
    chrome.storage.local.set({ passwords: message.passwords }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Passwords saved via external message!');
        sendResponse({ success: true, count: message.passwords.length });
      }
    });
    
    return true;
  }
  
  if (message.action === 'clearPasswords') {
    console.log('🗑️ Clearing passwords via external message...');
    
    chrome.storage.local.set({ passwords: [] }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Passwords cleared via external message!');
        sendResponse({ success: true, count: 0 });
      }
    });
    
    return true;
  }
  
  sendResponse({ success: false, error: 'Unknown action' });
});

// Listen for tab updates (to detect login pages)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if it's a login page
    const url = tab.url.toLowerCase();
    if (url.includes('login') || url.includes('signin') || url.includes('auth')) {
      // Show badge
      chrome.action.setBadgeText({ text: '🔐', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#4da2ff', tabId });
    }
  }
});

// Debug: Log when service worker starts
console.log('🚀 Service worker initialized');
console.log('📡 Listening for messages...');