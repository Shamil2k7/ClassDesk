'use client';

import React from 'react';
import { AlertCircle, Database, CheckCircle2 } from 'lucide-react';

interface SchemaNoticeProps {
  visible: boolean;
}

export function SchemaNotice({ visible }: SchemaNoticeProps) {
  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <Database className="w-4 h-4 text-amber-700" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>Supabase Schema Tables Not Found</span>
            <span className="text-[10px] font-semibold bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-full">
              1-Step Setup
            </span>
          </h4>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Your live Supabase project is connected, but the 18 database tables have not been created yet.
            Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-amber-950">Supabase SQL Editor</a>, paste the SQL from <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-amber-900 font-semibold">supabase/schema.sql</code>, and click <strong>Run</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
