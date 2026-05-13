import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function WalletConnect() {
  const { connected, connecting, disconnecting, publicKey, wallet, connect, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const address = publicKey?.toBase58();

  const handleClick = async () => {
    if (connected) {
      await disconnect();
      return;
    }

    if (!wallet) {
      setVisible(true);
      return;
    }

    try {
      await connect();
    } catch {
      setVisible(true);
    }
  };

  const label = connected
    ? truncateAddress(address)
    : connecting
      ? 'Connecting'
      : 'Connect Wallet';

  return (
    <button
      type="button"
      className={connected ? 'wallet-control is-connected' : 'wallet-control'}
      onClick={handleClick}
      disabled={connecting || disconnecting}
      aria-label={connected ? 'Disconnect wallet' : 'Connect wallet'}
    >
      <span>{label}</span>
    </button>
  );
}
