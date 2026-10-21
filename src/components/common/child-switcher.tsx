'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { Users, Check, ChevronDown } from 'lucide-react';

interface ChildSwitcherProps {
  variant?: 'light' | 'dark';
}

export function ChildSwitcher({ variant = 'light' }: ChildSwitcherProps) {
  const { user, activeChild, linkedChildren, switchChild } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  if (user?.role !== 'parent') {
    return null;
  }

  const childName = activeChild?.full_name || 'shamil k';
  const hasMultiple = linkedChildren && linkedChildren.length > 1;

  const buttonClasses =
    variant === 'dark'
      ? 'bg-white/15 hover:bg-white/25 border border-white/20 text-white'
      : 'bg-[#f1f5f9] hover:bg-slate-200/80 border border-slate-200/80 text-slate-800';

  return (
    <div className="relative">
      <button
        onClick={() => hasMultiple && setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all active:scale-95 touch-manipulation min-h-[34px] ${buttonClasses}`}
        aria-label={t('childSwitcher.switchChild', 'Switch Student')}
        title={hasMultiple ? 'Click to switch student' : `Active student: ${childName}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="max-w-[100px] xs:max-w-[130px] truncate">{childName}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${
            variant === 'dark' ? 'text-white/70' : 'text-slate-400'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {hasMultiple && isOpen && (
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
