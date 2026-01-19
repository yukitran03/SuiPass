// frontend/src/lib/extension-sync.ts

/**
 * Sync passwords from web app to browser extension
 * Uses window.postMessage to communicate with content script
 */

const EXTENSION_ID = 'fbkgcibfmgcmpoafkbljplnemldcphda';

/**
 * Sync passwords to extension via postMessage
 * This bypasses the inactive service worker issue
 */
export async function syncPasswordsToExtension(passwords: any[]) {
  try {
    console.log(`📤 Syncing ${passwords.length} passwords to extension...`);
    
    // Method 1: Try direct message to extension (if service worker active)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        await sendDirectMessage(passwords);
        return;
      } catch (error) {
        console.log('⚠️ Direct message failed, trying postMessage...');
      }
    }
    
    // Method 2: Use window.postMessage to content script
    sendViaPostMessage(passwords);
    
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

/**
 * Method 1: Direct message to extension
 */
function sendDirectMessage(passwords: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      {
        action: 'syncPasswords',
        passwords: passwords.map(entry => ({
          id: entry.id,
          site: entry.site,
          url: entry.url,
          username: entry.username,
          password: entry.password,
        }))
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log('✅ Direct sync success:', response);
          resolve();
        }
      }
    );
  });
}

/**
 * Method 2: Post message to content script
 */
function sendViaPostMessage(passwords: any[]) {
  // Send message to window (content script will listen)
  window.postMessage(
    {
      type: 'SUIPASS_SYNC',
      source: 'suipass-webapp',
      passwords: passwords.map(entry => ({
        id: entry.id,
        site: entry.site,
        url: entry.url,
        username: entry.username,
        password: entry.password,
      }))
    },
    window.location.origin
  );
  
  console.log('📨 Posted message to content script');
}

/**
 * Alternative: Use chrome.storage directly if extension has access
 */
export async function syncViaStorage(passwords: any[]) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ passwords });
      console.log('✅ Passwords synced via storage');
    }
  } catch (error) {
    console.error('Storage sync error:', error);
  }
}

/**
 * Clear passwords from extension when user logs out
 */
export async function clearExtensionPasswords() {
  try {
    console.log('🔄 Clearing passwords from extension...');
    
    // Method 1: Try direct message to extension
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        await new Promise<void>((resolve, reject) => {
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            {
              action: 'clearPasswords',
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                console.log('✅ Direct clear success:', response);
                resolve();
              }
            }
          );
        });
        return;
      } catch (error) {
        console.log('⚠️ Direct clear failed, trying postMessage...');
      }
    }
    
    // Method 2: Use window.postMessage to content script
    window.postMessage(
      {
        type: 'SUIPASS_CLEAR',
        source: 'suipass-webapp',
      },
      window.location.origin
    );
    
    console.log('📨 Posted clear message to content script');
  } catch (error) {
    console.error('❌ Clear error:', error);
  }
}