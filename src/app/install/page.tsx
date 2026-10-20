'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Download,
  Share2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Wifi,
  Sparkles,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppPage() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  const phoneUrl = 'http://192.168.1.6:3000';

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.warn);
    }

    // Check if already in standalone display mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'To install on Android:\n1. Open Chrome on your phone.\n2. Tap the 3 dots menu (⋮) in the top right.\n3. Tap "Install app" or "Add to Home screen".'
      );
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(phoneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Smartphone className="w-8 h-8 text-white" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
          Mobile App Installation
        </span>
        <h1 className="text-xl sm:text-2xl font-black mt-2">Get ClassDesk on Your Phone</h1>
        <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-sm mx-auto leading-relaxed">
          Install ClassDesk directly onto your Android phone or iPhone. No Play Store download needed, zero storage bloat.
        </p>

        {/* 1-Tap Install Button */}
        <div className="mt-6">
          {isInstalled ? (
            <div className="bg-emerald-500/20 border border-emerald-400 text-emerald-100 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>ClassDesk is already installed on this device!</span>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full sm:w-auto bg-white hover:bg-slate-100 active:scale-95 text-indigo-900 px-6 py-4 rounded-2xl text-xs sm:text-sm font-black shadow-xl shadow-indigo-950/20 flex items-center justify-center gap-2 transition-all mx-auto min-h-[48px]"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Install App on this Device</span>
            </button>
          )}
        </div>
      </div>

      {/* Method 1: Install on Your Android Phone via Local Wi-Fi */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">How to Open on Your Phone (Same Wi-Fi)</h2>
            <p className="text-xs text-slate-500">Connect your phone to the same Wi-Fi network as this PC</p>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-400">Your Phone URL</p>
            <p className="text-xs sm:text-sm font-mono font-bold text-indigo-700 truncate mt-0.5">
              {phoneUrl}
            </p>
          </div>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* 3 Step Installation Flow */}
        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Open Chrome on your Android Phone</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Type <code className="bg-white px-1.5 py-0.5 rounded font-mono text-indigo-700">{phoneUrl}</code> in Chrome on your phone.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home Screen&rdquo;</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Chrome will show an automatic pop-up prompt at the bottom: <strong>&ldquo;Add ClassDesk to Home screen&rdquo;</strong> (or tap the 3 dots menu ⋮ -&gt; &ldquo;Install app&rdquo;).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Opens Just Like a Native App</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                The ClassDesk icon appears on your Android home screen. It opens full screen with zero URL bar, works with slow 3G/4G, and has 103 KB instant launch.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Method 2: Android APK (.apk) Generation */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Want a Standalone .APK File?</h2>
            <p className="text-xs text-slate-500">For WhatsApp APK distribution or publishing to Google Play Store</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          ClassDesk has been equipped with a <strong>Capacitor configuration (`capacitor.config.json`)</strong> and PWA Manifest. You can generate a native Android Studio project and compile a standalone `.apk` using:
        </p>

        <div className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl font-mono text-[11px] space-y-1">
          <p className="text-slate-400"># 1. Install Capacitor CLI &amp; Android engine</p>
          <p className="text-indigo-400">npm install @capacitor/core @capacitor/cli @capacitor/android</p>
          <p className="text-slate-400 mt-2"># 2. Add Android platform</p>
          <p className="text-indigo-400">npx cap add android</p>
          <p className="text-slate-400 mt-2"># 3. Open in Android Studio &amp; Build APK</p>
          <p className="text-indigo-400">npx cap open android</p>
        </div>
      </div>

      {/* App Features Badge Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center">
          <p className="text-xs font-bold text-slate-900">103 KB</p>
          <p className="text-[10px] text-slate-400">Ultra-Lightweight</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center">
          <p className="text-xs font-bold text-slate-900">Budget Android</p>
          <p className="text-[10px] text-slate-400">2GB RAM Phones</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center">
          <p className="text-xs font-bold text-slate-900">Offline Caching</p>
          <p className="text-[10px] text-slate-400">Service Worker v1</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center">
          <p className="text-xs font-bold text-slate-900">Push Alerts</p>
          <p className="text-[10px] text-slate-400">Firebase FCM</p>
        </div>
      </div>
    </div>
  );
}
