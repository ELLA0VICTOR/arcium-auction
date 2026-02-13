import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function WalletConnect() {
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex items-center gap-4">
      {connected && publicKey && (
        <div className="hidden sm:flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-purple-200 font-mono text-sm">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
        </div>
      )}
      <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-purple-500 !rounded-xl hover:!from-purple-500 hover:!to-purple-400 transition-all !font-semibold" />
    </div>
  );
}