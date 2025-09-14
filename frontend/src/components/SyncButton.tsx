import React, { useState } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

interface SyncButtonProps {
  onSync?: () => Promise<void>;
  className?: string;
}

export function SyncButton({ onSync, className = '' }: SyncButtonProps) {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const handleSync = async () => {
    setSyncState('syncing');
    
    try {
      if (onSync) {
        await onSync();
      } else {
        // Simulate sync process
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setSyncState('success');
      setTimeout(() => setSyncState('idle'), 2000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 3000);
    }
  };

  const getButtonContent = () => {
    switch (syncState) {
      case 'syncing':
        return (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Syncing...</span>
          </>
        );
      case 'success':
        return (
          <>
            <Check className="w-4 h-4" />
            <span>Synced</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Failed</span>
          </>
        );
      default:
        return (
          <>
            <RefreshCw className="w-4 h-4" />
            <span>Sync Data</span>
          </>
        );
    }
  };

  const getButtonStyles = () => {
    switch (syncState) {
      case 'success':
        return 'bg-green-500/20 text-green-500 hover:bg-green-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-500 hover:bg-red-500/30';
      default:
        return 'bg-oura-activity/20 text-oura-activity hover:bg-oura-activity/30';
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncState === 'syncing'}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-70
        ${getButtonStyles()}
        ${className}
      `}
    >
      {getButtonContent()}
    </button>
  );
}