'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { Users, Check, ChevronDown } from 'lucide-react';

export function ChildSwitcher() {
  const { user, activeChild, linkedChildren, switchChild } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  // Only render switcher if user is a parent and has linked children
  if (user?.role !== 'parent' || linkedChildren.length <= 1) {
    if (user?.role === 'parent' && activeChild) {
      return (
        <div className="flex items-center gap-1.5 xs:gap-2 bg-indigo-50 border border-indigo-200 text-indigo-900 px-2.5 py-1 rounded-full text-xs font-medium max-w-[140px] xs:max-w-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="truncate max-w-[70px] xs:max-w-[120px]">{activeChild.full_name}</span>
          <span className="text-indigo-400 hidden xs:inline">|</span>
          <span className="text-indigo-600 hidden xs:inline">Roll {activeChild.roll_number}</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all active:scale-95 touch-manipulation min-h-[36px]"
        aria-label={t('childSwitcher.switchChild', 'Switch Student')}
      >
        <Users className="w-3.5 h-3.5" />
        <span className="max-w-[110px] truncate">{activeChild?.full_name || 'Select Child'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-700">
                {t('childSwitcher.multipleLinked', 'Children Linked to this Phone')}
              </p>
              <p className="text-[10px] text-slate-500">{user.phone}</p>
            </div>

            <div className="p-2 space-y-1">
              {linkedChildren.map((child) => {
                const isSelected = activeChild?.id === child.id;
                return (
                  <button
                    key={child.id}
                    onClick={() => {
                      switchChild(child.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors min-h-[48px] ${
                      isSelected
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                        {child.full_name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{child.full_name}</p>
                        <p className="text-[11px] text-slate-500">
                          Roll #{child.roll_number} • Adm: {child.admission_number}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
