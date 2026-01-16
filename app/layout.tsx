import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PumpFun Deployer Hunter - Powered by Claude',
  description: 'Track promising PumpFun tokens with proven deployers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="cyber-grid"></div>
        <div className="scanline"></div>
        {children}
      </body>
    </html>
  );
}
