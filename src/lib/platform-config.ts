'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PlatformBranding {
  name: string;
  tagline: string;
  logo_url: string | null;
}

export const DEFAULT_PLATFORM_BRANDING: PlatformBranding = {
  name: 'ClassDesk',
  tagline: 'School & Tuition Management Platform',
  logo_url: null,
};

const STORAGE_KEY = 'classdesk_platform_branding';
const EVENT_NAME = 'classdesk_branding_updated';

export function getPlatformBranding(): PlatformBranding {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_BRANDING;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_BRANDING;
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name?.trim() || DEFAULT_PLATFORM_BRANDING.name,
      tagline: parsed.tagline?.trim() || DEFAULT_PLATFORM_BRANDING.tagline,
      logo_url: parsed.logo_url || null,
    };
  } catch {
    return DEFAULT_PLATFORM_BRANDING;
  }
}

export function savePlatformBranding(branding: Partial<PlatformBranding>): PlatformBranding {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_BRANDING;
  const current = getPlatformBranding();
  const updated: PlatformBranding = {
    name: branding.name !== undefined ? (branding.name.trim() || DEFAULT_PLATFORM_BRANDING.name) : current.name,
    tagline: branding.tagline !== undefined ? (branding.tagline.trim() || DEFAULT_PLATFORM_BRANDING.tagline) : current.tagline,
    logo_url: branding.logo_url !== undefined ? branding.logo_url : current.logo_url,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
  return updated;
}

export function resetPlatformBranding(): PlatformBranding {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_BRANDING;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: DEFAULT_PLATFORM_BRANDING }));
  return DEFAULT_PLATFORM_BRANDING;
}

export function usePlatformBranding() {
  const [branding, setBranding] = useState<PlatformBranding>(DEFAULT_PLATFORM_BRANDING);

  useEffect(() => {
    setBranding(getPlatformBranding());

    const handleUpdate = () => {
      setBranding(getPlatformBranding());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const update = useCallback((newBranding: Partial<PlatformBranding>) => {
    const saved = savePlatformBranding(newBranding);
    setBranding(saved);
  }, []);

  const reset = useCallback(() => {
    const defaultVal = resetPlatformBranding();
    setBranding(defaultVal);
  }, []);

  return { branding, updateBranding: update, resetBranding: reset };
}
