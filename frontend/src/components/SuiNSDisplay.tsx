// frontend/src/components/SuiNSDisplay.tsx

import { useSuiNS } from '@/hooks/useSuiNS';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface SuiNSDisplayProps {
  address: string;
  showFull?: boolean; // Show full address below NS name
  showCopy?: boolean; // Show copy button
  showLink?: boolean; // Show link to explorer
  className?: string;
}

export function SuiNSDisplay({
  address,
  showFull = false,
  showCopy = true,
  showLink = false,
  className = '',
}: SuiNSDisplayProps) {
  const { data: nsName, isLoading } = useSuiNS(address);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortenedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const explorerUrl = `https://suiscan.xyz/testnet/account/${address}`;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse bg-gray-700 h-4 w-24 rounded" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Name or Address */}
      <div className="flex flex-col">
        {nsName ? (
          <>
            <span className="font-semibold text-blue-400">
              {nsName}
            </span>
            {showFull && (
              <span className="text-xs text-gray-400">
                {shortenedAddress}
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-300">
            {shortenedAddress}
          </span>
        )}
      </div>

      {/* Copy Button */}
      {showCopy && (
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Copy address"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      )}

      {/* Explorer Link */}
      {showLink && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="View on explorer"
        >
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </a>
      )}
    </div>
  );
}

/**
 * Compact version - just shows the name/address
 */
export function SuiNSCompact({ address }: { address: string }) {
  const { data: nsName, isLoading } = useSuiNS(address);

  if (isLoading) {
    return <span className="text-gray-400">...</span>;
  }

  if (nsName) {
    return <span className="text-blue-400 font-medium">{nsName}</span>;
  }

  return (
    <span className="text-gray-300">
      {address.slice(0, 6)}...{address.slice(-4)}
    </span>
  );
}