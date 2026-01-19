// frontend/src/App.tsx - With zkLogin Integration

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { networkConfig } from './lib/sui-config';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import {
  useVault,
  useCreateVault,
  useAddPassword,
  useUpdatePassword,
  useDeletePassword,
  useDeletePasswords,
  useDeleteVault,
  useVaultData,
} from './hooks/useVault';
import { useZkLogin } from './hooks/useZkLogin';
import { OAuthCallback } from './components/OAuthCallback';
import { useState, useMemo, useEffect } from 'react';
import { generatePassword, calculatePasswordStrength, DEFAULT_PASSWORD_OPTIONS } from './lib/password-generator';
import { syncPasswordsToExtension, clearExtensionPasswords } from './lib/extension-sync';
import '@mysten/dapp-kit/dist/index.css';
import './index.css';
import { SuiNSDisplay } from '@/components/SuiNSDisplay';
import { RegisterSuiNSModal } from '@/components/RegisterSuiNSModal';

const queryClient = new QueryClient();

function Dashboard() {
  const account = useCurrentAccount();
  const { data: vault, isLoading } = useVault();
  const { data: vaultData } = useVaultData();
  const createVault = useCreateVault();
  const addPassword = useAddPassword();
  const updatePassword = useUpdatePassword();
  const deletePassword = useDeletePassword();
  const deletePasswords = useDeletePasswords();
  const deleteVault = useDeleteVault();
  
  // zkLogin integration
  const zkLogin = useZkLogin();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegisterNS, setShowRegisterNS] = useState(false);
  
  const [formData, setFormData] = useState({
    site: '',
    url: '',
    username: '',
    password: '',
    notes: '',
  });

  // Persistent Sessions: Store last connected wallet address
  useEffect(() => {
    if (account?.address) {
      localStorage.setItem('suipass_last_wallet_address', account.address);
      console.log('💾 Saved wallet address for persistence');
    }
  }, [account?.address]);

  // Persistent Sessions: Store zkLogin address
  useEffect(() => {
    if (zkLogin.isAuthenticated && zkLogin.suiAddress) {
      localStorage.setItem('suipass_last_zklogin_address', zkLogin.suiAddress);
      console.log('💾 Saved zkLogin address for persistence');
    }
  }, [zkLogin.isAuthenticated, zkLogin.suiAddress]);

  // Get effective user (wallet or zkLogin)
  const effectiveAddress = account?.address || zkLogin.suiAddress;
  const isLoggedIn = !!effectiveAddress;

  // Sync passwords to extension when user logs in
  useEffect(() => {
    if (isLoggedIn && vaultData?.entries) {
      console.log('🔐 User logged in, syncing to extension...');
      syncPasswordsToExtension(vaultData.entries);
    }
  }, [isLoggedIn, vaultData?.entries]);

  // Clear extension passwords when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      console.log('🔓 User logged out, clearing extension...');
      clearExtensionPasswords();
    }
  }, [isLoggedIn]);

  // Filter passwords based on search
  const filteredEntries = useMemo(() => {
    if (!vaultData?.entries) return [];
    if (!searchQuery) return vaultData.entries;
    
    const query = searchQuery.toLowerCase();
    return vaultData.entries.filter(entry => 
      entry.site.toLowerCase().includes(query) ||
      entry.username.toLowerCase().includes(query) ||
      entry.url?.toLowerCase().includes(query) ||
      entry.notes?.toLowerCase().includes(query)
    );
  }, [vaultData, searchQuery]);

  // Password strength for form
  const passwordStrength = useMemo(() => {
    if (!formData.password) return null;
    return calculatePasswordStrength(formData.password);
  }, [formData.password]);

  const handleGeneratePassword = () => {
    const generated = generatePassword(DEFAULT_PASSWORD_OPTIONS);
    setFormData({ ...formData, password: generated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updatePassword.mutate(
        { entryId: editingId, updates: formData },
        {
          onSuccess: () => {
            setShowForm(false);
            setEditingId(null);
            setFormData({ site: '', url: '', username: '', password: '', notes: '' });
          },
        }
      );
    } else {
      addPassword.mutate(formData, {
        onSuccess: () => {
          setShowForm(false);
          setFormData({ site: '', url: '', username: '', password: '', notes: '' });
        },
      });
    }
  };

  const handleEdit = (entryId: string) => {
    const entry = vaultData?.entries.find(e => e.id === entryId);
    if (entry) {
      setFormData({
        site: entry.site,
        url: entry.url,
        username: entry.username,
        password: entry.password,
        notes: entry.notes || '',
      });
      setEditingId(entryId);
      setShowForm(true);
    }
  };

  const handleDelete = (entryId: string) => {
    if (confirm('Are you sure you want to delete this password?')) {
      deletePassword.mutate(entryId);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} selected passwords?`)) {
      deletePasswords.mutate(selectedIds, {
        onSuccess: () => setSelectedIds([]),
      });
    }
  };

  const handleDeleteVault = () => {
    if (confirm('⚠️ Delete ENTIRE vault? This cannot be undone!')) {
      if (confirm('Are you ABSOLUTELY sure? All passwords will be lost!')) {
        deleteVault.mutate();
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map(e => e.id));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    const toast = document.createElement('div');
    toast.textContent = `✓ ${label} copied!`;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #22c55e;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Welcome screen - show login options
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-8 max-w-md px-4">
          <div>
            <h1 className="text-5xl font-bold mb-4" style={{ color: '#4DA2FF' }}>
              🔐 SuiPass
            </h1>
            <p className="text-xl opacity-70">Decentralized Password Manager</p>
          </div>

          <div className="space-y-4">
            {/* zkLogin Option */}
            <div className="bg-secondary/30 border border-border rounded-lg p-6">
              <h3 className="font-bold mb-2">🎯 Sign in with Google</h3>
              <p className="text-sm opacity-70 mb-4">
                Passwordless login. No seed phrases needed.
              </p>
              {zkLogin.error && (
                <div className="mb-4 text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">
                  {zkLogin.error}
                </div>
              )}
              <button
                onClick={zkLogin.loginWithGoogle}
                disabled={zkLogin.isLoading}
                className="w-full px-4 py-2 bg-[hsl(210,100%,63%)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {zkLogin.isLoading ? '⏳ Processing...' : '🔐 Sign in with Google'}
              </button>
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-4 opacity-50">
              <div className="flex-1 border-t border-border"></div>
              <span className="text-sm">OR</span>
              <div className="flex-1 border-t border-border"></div>
            </div>

            {/* Wallet Connect Option */}
            <div className="bg-secondary/30 border border-border rounded-lg p-6">
              <h3 className="font-bold mb-2">👛 Connect Wallet</h3>
              <p className="text-sm opacity-70 mb-4">
                Use Sui Wallet extension
              </p>
              <ConnectButton className="w-full" />
            </div>
          </div>

          <p className="text-xs opacity-40">
            Built on Sui • Stored on Walrus • Encrypted
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || zkLogin.isLoading) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-border bg-secondary/50 backdrop-blur-sm sticky top-0">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">SuiPass</h1>
              {effectiveAddress && (
                <SuiNSDisplay 
                  address={effectiveAddress}
                  showFull={false}
                  showCopy={true}
                  className="hidden sm:flex"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {effectiveAddress && (
                <button
                  onClick={() => setShowRegisterNS(true)}
                  className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                >
                  Get .sui name
                </button>
              )}
              {account ? <ConnectButton /> : (
                <button
                  onClick={zkLogin.logout}
                  className="px-4 py-2 bg-secondary text-sm rounded-lg hover:opacity-90"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 73px)' }}>
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="opacity-70">Loading vault...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-border bg-secondary/50 backdrop-blur-sm sticky top-0">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">SuiPass</h1>
              {effectiveAddress && (
                <SuiNSDisplay 
                  address={effectiveAddress}
                  showFull={false}
                  showCopy={true}
                  className="hidden sm:flex"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {effectiveAddress && (
                <button
                  onClick={() => setShowRegisterNS(true)}
                  className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                >
                  Get .sui name
                </button>
              )}
              {account ? <ConnectButton /> : (
                <button
                  onClick={zkLogin.logout}
                  className="px-4 py-2 bg-secondary text-sm rounded-lg hover:opacity-90"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </header>
        
        <main className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 73px)' }}>
          <div className="text-center space-y-6 max-w-md px-4">
            <h1 className="text-4xl font-bold">Create Your Vault</h1>
            <p className="opacity-70">
              Your vault will store encrypted passwords on Sui + Walrus
            </p>
            <button
              onClick={() => createVault.mutate()}
              disabled={createVault.isPending}
              className="px-6 py-3 bg-[hsl(210,100%,63%)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {createVault.isPending ? 'Creating...' : 'Create Vault'}
            </button>
            {createVault.isError && (
              <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded p-3">
                <p className="font-semibold">Error creating vault:</p>
                <p className="mt-1">{(createVault.error as Error).message}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">SuiPass</h1>
            {effectiveAddress && (
              <SuiNSDisplay 
                address={effectiveAddress}
                showFull={false}
                showCopy={true}
                className="hidden sm:flex"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {effectiveAddress && (
              <button
                onClick={() => setShowRegisterNS(true)}
                className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
              >
                Get .sui name
              </button>
            )}
            {account ? <ConnectButton /> : (
              <button
                onClick={zkLogin.logout}
                className="px-4 py-2 bg-secondary text-sm rounded-lg hover:opacity-90"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold">Your Vault</h2>
              <div className="space-y-1">
                <p className="opacity-70 text-sm">
                  {vault.entryCount} passwords • Version {vault.version}
                </p>
                <div className="flex items-center gap-2 text-xs opacity-50">
                  <span>Owner:</span>
                  <SuiNSDisplay 
                    address={vault.owner}
                    showFull={false}
                    showCopy={false}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ site: '', url: '', username: '', password: '', notes: '' });
                  setShowForm(!showForm);
                }}
                className="px-4 py-2 bg-[hsl(210,100%,63%)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                {showForm ? '✕ Cancel' : '+ Add Password'}
              </button>
              <button
                onClick={handleDeleteVault}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Search & Bulk Actions */}
          {!showForm && (
            <div className="flex gap-3 flex-wrap items-center">
              <input
                type="text"
                placeholder="🔍 Search passwords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2 bg-secondary border border-border rounded-lg"
              />
              {selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90"
                >
                  Delete {selectedIds.length} selected
                </button>
              )}
              {filteredEntries.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-secondary border border-border rounded-lg hover:opacity-90"
                >
                  {selectedIds.length === filteredEntries.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <div className="bg-secondary/30 border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">
                {editingId ? 'Edit Password' : 'Add New Password'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Site Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.site}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    className="w-full px-3 py-2 bg-[hsl(220,20%,18%)] border border-border rounded"
                    placeholder="e.g., Google"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">URL</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 bg-[hsl(220,20%,18%)] border border-border rounded"
                    placeholder="https://google.com"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 bg-[hsl(220,20%,18%)] border border-border rounded"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Password *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="flex-1 px-3 py-2 bg-[hsl(220,20%,18%)] border border-border rounded"
                      placeholder="Enter or generate password"
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="px-4 py-2 bg-[hsl(187,100%,50%)] text-black rounded hover:opacity-90"
                    >
                      🎲 Generate
                    </button>
                  </div>
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Strength: {passwordStrength.label}</span>
                        <span>{passwordStrength.score}%</span>
                      </div>
                      <div className="h-2 bg-[hsl(220,20%,18%)] rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${passwordStrength.score}%`,
                            backgroundColor: passwordStrength.color,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[hsl(220,20%,18%)] border border-border rounded"
                    rows={2}
                    placeholder="Optional notes"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addPassword.isPending || updatePassword.isPending}
                  className="w-full px-4 py-2 bg-[hsl(210,100%,63%)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {addPassword.isPending || updatePassword.isPending
                    ? 'Saving...'
                    : editingId
                    ? 'Update Password'
                    : 'Save Password'}
                </button>
              </form>
            </div>
          )}

          {/* Password List */}
          {filteredEntries.length > 0 ? (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-secondary/30 border border-border rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(entry.id)}
                      onChange={() => toggleSelect(entry.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">{entry.site}</h4>
                          {entry.url && (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm opacity-70 hover:opacity-100"
                            >
                              {entry.url}
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(entry.id)}
                            className="px-3 py-1 text-sm bg-[hsl(220,20%,28%)] rounded hover:opacity-90"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="px-3 py-1 text-sm bg-red-600 rounded hover:opacity-90"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="opacity-70">Username:</span>
                          <div className="flex gap-2 items-center">
                            <code className="bg-[hsl(220,20%,18%)] px-2 py-1 rounded">
                              {entry.username}
                            </code>
                            <button
                              onClick={() => copyToClipboard(entry.username, 'Username')}
                              className="px-2 py-1 text-xs bg-[hsl(210,100%,63%)] text-white rounded hover:opacity-90"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="opacity-70">Password:</span>
                          <div className="flex gap-2 items-center">
                            <code className="bg-[hsl(220,20%,18%)] px-2 py-1 rounded">
                              {showPassword[entry.id] ? entry.password : '••••••••'}
                            </code>
                            <button
                              onClick={() => togglePasswordVisibility(entry.id)}
                              className="px-2 py-1 text-xs bg-[hsl(220,20%,28%)] text-white rounded hover:opacity-90"
                            >
                              {showPassword[entry.id] ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => copyToClipboard(entry.password, 'Password')}
                              className="px-2 py-1 text-xs bg-[hsl(210,100%,63%)] text-white rounded hover:opacity-90"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>

                      {entry.notes && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-sm opacity-70">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 opacity-70">
              {searchQuery ? (
                <p>No passwords match "{searchQuery}"</p>
              ) : (
                <p>No passwords yet. Click "Add Password" to get started!</p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Register SuiNS Modal */}
      <RegisterSuiNSModal 
        isOpen={showRegisterNS} 
        onClose={() => setShowRegisterNS(false)} 
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
          </Routes>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;