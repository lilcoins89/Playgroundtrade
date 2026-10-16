import React, { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { DEVNET_RPC_URL } from '../utils/solana';

export interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  // Explicitly configured to Solana Devnet only
  const endpoint = useMemo(() => DEVNET_RPC_URL, []);

  // Standard wallet adapters: Empty array enables automatic detection of all
  // Wallet-Standard compatible wallets (Phantom, Solflare, Backpack, etc.)
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
