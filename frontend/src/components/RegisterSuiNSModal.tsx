// frontend/src/components/RegisterSuiNSModal.tsx

import { X, ExternalLink } from 'lucide-react';

interface RegisterSuiNSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterSuiNSModal({ isOpen, onClose }: RegisterSuiNSModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(220,26%,14%)] border border-[hsl(220,20%,28%)] rounded-lg max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Get a .sui Name</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[hsl(220,20%,28%)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm opacity-70">
          Register your own .sui name on the official SuiNS registry. Replace your long address with something memorable!
        </p>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-sm space-y-1">
          <p className="font-semibold text-blue-400">💡 About SuiNS:</p>
          <ul className="space-y-1 opacity-70 text-xs">
            <li>• Get your personalized .sui name</li>
            <li>• Use instead of long addresses</li>
            <li>• Register for 1-5 years</li>
            <li>• Testnet has 99% discount!</li>
          </ul>
        </div>

        {/* Open SuiNS Registry Button */}
        <a
          href="https://testnet.suins.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full px-4 py-3 bg-[hsl(210,100%,63%)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-semibold"
        >
          <ExternalLink className="w-5 h-5" />
          Open SuiNS Registry
        </a>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-secondary border border-border rounded-lg hover:opacity-90 transition-opacity text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
