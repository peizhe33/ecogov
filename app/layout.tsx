'use client';

import React, { useState } from 'react';
import '../styles/globals.css';
import { Home, ClipboardEdit, Archive, FileText, Settings } from 'lucide-react';
import { ViewContext, TabContext, type ViewMode, type TabMode } from './view-context';

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const [activeView, setActiveView] = useState<ViewMode>('enterprise');
  const [activeTab, setActiveTab] = useState<TabMode>('dashboard');

  const navItems: { label: string; icon: typeof Home; tab: TabMode }[] = [
    { label: 'Dashboard', icon: Home, tab: 'dashboard' },
    { label: 'Waste Intake', icon: ClipboardEdit, tab: 'intake' },
    { label: 'Decommissioning Logs', icon: Archive, tab: 'logs' },
    { label: 'Compliance Packets', icon: FileText, tab: 'packets' },
    { label: 'Settings', icon: Settings, tab: 'settings' }
  ];

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-slate-900">
        <div className="h-screen w-full overflow-hidden">
          <aside className="fixed left-0 top-0 h-full w-72 bg-slate-900 text-slate-100 shadow-2xl">
            <div className="border-b border-slate-800 px-6 py-6">
              <div className="flex items-center gap-3">
                <img
                  src="/ecogov-logo.png"
                  alt="EcoGov AI logo"
                  className="h-20 w-20 object-contain"
                />
                <div>
                  <p className="text-base font-semibold tracking-wide">EcoGov AI</p>
                  <p className="text-xs text-slate-400">B2G Intelligence Console</p>
                </div>
              </div>
            </div>

            <nav className="px-4 py-5">
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.tab;
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(item.tab)}
                        aria-current={active ? 'page' : undefined}
                        className={[
                          'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors',
                          active
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        ].join(' ')}
                      >
                        <Icon className={active ? 'text-white' : 'text-slate-400'} size={18} />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <header className="fixed left-72 right-0 top-0 z-20 h-16 border-b border-slate-200 bg-white">
            <div className="relative h-full px-6">
              <div className="flex h-full items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Site Context:</span>
                  <span className="font-semibold text-slate-800">Johor Data Center Alpha</span>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                  EG
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto rounded-full border border-slate-200 bg-slate-100 p-1 shadow-sm">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveView('enterprise')}
                      className={[
                        'rounded-full px-4 py-1.5 text-sm font-semibold transition-all',
                        activeView === 'enterprise'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-600 hover:bg-slate-200'
                      ].join(' ')}
                    >
                      Enterprise View
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('regulator')}
                      className={[
                        'rounded-full px-4 py-1.5 text-sm font-semibold transition-all',
                        activeView === 'regulator'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-600 hover:bg-slate-200'
                      ].join(' ')}
                    >
                      Regulator View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="ml-72 mt-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="min-h-[calc(100vh-4rem)] p-8">
              <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <h1 className="text-xl font-semibold text-slate-900">
                  {activeView === 'enterprise' ? 'Enterprise Dashboard' : 'Regulator Dashboard'}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {activeView === 'enterprise'
                    ? 'Enterprise overview and decommissioning performance snapshot.'
                    : 'Regulatory oversight and compliance readiness snapshot.'}
                </p>
                <div className="mt-6">
                  <ViewContext.Provider value={activeView}>
                    <TabContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabContext.Provider>
                  </ViewContext.Provider>
                </div>
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
