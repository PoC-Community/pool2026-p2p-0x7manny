'use client';

import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from '@/lib/wagmi';

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="cyber-grid">
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: '#7c3aed',
                accentColorForeground: 'white',
                borderRadius: 'medium',
                overlayBlur: 'small',
              })}
            >
              <div className="min-h-screen flex flex-col">
                {/* Header */}
                <header className="border-b border-cyber-purple/30 bg-cyber-dark/80 backdrop-blur-md sticky top-0 z-50">
                  <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h1 className="text-2xl font-bold">
                        <span className="text-cyber-purple">POC</span>
                        <span className="text-white">::</span>
                        <span className="neon-text-cyan">DeFi</span>
                      </h1>
                      <span className="badge-active">Day 04</span>
                    </div>
                    <w3m-button />
                  </div>
                </header>

                {/* Main Content */}
                <main className="flex-1">
                  {children}
                </main>

                {/* Footer */}
                <footer className="border-t border-cyber-purple/30 bg-cyber-dark/80 py-4">
                  <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
                    <p>PoC Innovation - Blockchain Discovery Pool</p>
                  </div>
                </footer>
              </div>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
