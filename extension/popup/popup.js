// extension/popup/popup.js

console.log('🔐 SuiPass popup loaded');

// State
let allPasswords = [];
let currentTab = null;

// DOM Elements
const searchInput = document.getElementById('search-input');
const passwordList = document.getElementById('password-list');
const countBadge = document.getElementById('count-badge');
const openAppBtn = document.getElementById('open-app-btn');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const noResults = document.getElementById('no-results');

// Initialize
async function init() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    // Load passwords from storage
    await loadPasswords();
    
    // Setup event listeners
    searchInput.addEventListener('input', handleSearch);
    openAppBtn.addEventListener('click', openWebApp);
    
    // Listen for storage changes (real-time sync)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.passwords) {
        console.log('🔄 Passwords updated');
        loadPasswords();
      }
    });
    
  } catch (error) {
    console.error('❌ Init error:', error);
    showError('Failed to load passwords');
  }
}

// Load passwords from chrome.storage
async function loadPasswords() {
  try {
    const result = await chrome.storage.local.get(['passwords']);
    allPasswords = result.passwords || [];
    
    console.log('📦 Loaded passwords:', allPasswords.length);
    
    // Update count badge
    countBadge.textContent = allPasswords.length;
    
    // Hide loading
    loading.style.display = 'none';
    
    // Show empty state or passwords
    if (allPasswords.length === 0) {
      emptyState.style.display = 'block';
      passwordList.innerHTML = '';
    } else {
      emptyState.style.display = 'none';
      renderPasswords(allPasswords);
    }
    
  } catch (error) {
    console.error('❌ Load error:', error);
    showError('Failed to load passwords');
  }
}

// Render password list
function renderPasswords(passwords) {
  if (passwords.length === 0) {
    passwordList.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  
  noResults.style.display = 'none';
  
  // Get current site domain for matching
  const currentDomain = currentTab?.url ? extractDomain(currentTab.url) : '';
  
  // Sort: matching site first
  const sorted = [...passwords].sort((a, b) => {
    const aMatches = doesPasswordMatchSite(a, currentDomain);
    const bMatches = doesPasswordMatchSite(b, currentDomain);
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    return 0;
  });
  
  passwordList.innerHTML = sorted.map(password => {
    const matches = doesPasswordMatchSite(password, currentDomain);
    return `
      <div class="password-item" data-id="${password.id}">
        <div class="password-site">
          ${matches ? '<span class="match-indicator"></span>' : ''}
          ${escapeHtml(password.site)}
        </div>
        <div class="password-username">${escapeHtml(password.username)}</div>
        ${password.url ? `<div class="password-url">${escapeHtml(password.url)}</div>` : ''}
      </div>
    `;
  }).join('');
  
  // Add click handlers
  document.querySelectorAll('.password-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const password = allPasswords.find(p => p.id === id);
      if (password) {
        fillPassword(password);
      }
    });
  });
}

// Handle search
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    renderPasswords(allPasswords);
    return;
  }
  
  const filtered = allPasswords.filter(password => 
    password.site.toLowerCase().includes(query) ||
    password.username.toLowerCase().includes(query) ||
    (password.url && password.url.toLowerCase().includes(query)) ||
    (password.notes && password.notes.toLowerCase().includes(query))
  );
  
  renderPasswords(filtered);
}

// Fill password in active tab
async function fillPassword(password) {
  try {
    // Send to content script
    await chrome.tabs.sendMessage(currentTab.id, {
      action: 'fillPassword',
      username: password.username,
      password: password.password
    });
    
    // Show success (optional - content script shows notification)
    console.log('✅ Password filled:', password.site);
    
    // Close popup after short delay
    setTimeout(() => window.close(), 500);
    
  } catch (error) {
    console.error('❌ Fill error:', error);
    
    // Show error
    showNotification('❌ Failed to fill password. Try refreshing the page.');
  }
}

// Open web app
function openWebApp() {
  chrome.tabs.create({ url: 'http://localhost:5173' });
  window.close();
}

// Check if password matches current site
function doesPasswordMatchSite(password, currentDomain) {
  if (!currentDomain) return false;
  
  const passwordDomain = password.url ? extractDomain(password.url) : password.site.toLowerCase();
  
  return currentDomain.includes(passwordDomain) || 
         passwordDomain.includes(currentDomain);
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const { hostname } = new URL(url);
    // Remove www. prefix
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show error message
function showError(message) {
  loading.style.display = 'none';
  emptyState.style.display = 'none';
  passwordList.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <h3>Error</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

// Show notification (in popup)
function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1d29;
    color: white;
    padding: 10px 16px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-size: 13px;
    z-index: 9999;
    border: 1px solid #3d4256;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 2000);
}

// Start
init();
