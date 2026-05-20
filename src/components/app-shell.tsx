'use client';
import { useState } from 'react';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { NewTxSheet } from './new-tx-sheet';
import { ChatBubble } from './chat-bubble';

export function AppShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <div className="min-h-screen" style={{ background: 'var(--c-bg)' }}>
      <Sidebar userName={userName} onNew={() => setSheetOpen(true)} />
      <div className="lg:ml-56">
        <main className="px-4 pt-4 pb-36 lg:pb-8 max-w-2xl">{children}</main>
      </div>
      <BottomNav onNew={() => setSheetOpen(true)} />
      <ChatBubble />
      {sheetOpen && <NewTxSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
