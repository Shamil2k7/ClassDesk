'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { usePlatformBranding } from '@/lib/platform-config';
import { getLocalData } from '@/lib/storage-helper';
import { Institute } from '@/types/app.types';
import {
  GraduationCap,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  Building2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const instituteQuery = searchParams.get('institute') || searchParams.get('slug') || searchParams.get('inst');

  const { loginWithPhone, loginWithEmail, verifyOtp, isAuthenticated, user, loading: authLoading, switchInstitute } = useAuth();
  const { branding } = usePlatformBranding();
  const { t } = useTranslation();

  // Institute resolution state for institute-specific login URLs
  const [resolvedInstitute, setResolvedInstitute] = useState<Institute | null>(null);
  const [resolvingInstitute, setResolvingInstitute] = useState(false);

  // Tab: 'email' | 'otp'
  const [authMode, setAuthMode] = useState<'email' | 'otp'>('email');

  // Email form state
  const [email, setEmail] = useState('admin@classdesk.app');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP form state
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('123456');

  // Status state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Resolve institute if `?institute=<slug_or_id>` is present
  useEffect(() => {
    if (!instituteQuery) {
      setResolvedInstitute(null);
      return;
    }

    setResolvingInstitute(true);
    const cleanQuery = instituteQuery.trim().toLowerCase();

    // Check local storage institutes first for immediate response
    const localInsts = getLocalData<Institute>('institutes');
    const matchedLocal = localInsts.find(
      (i) => i.id === instituteQuery || i.slug.toLowerCase() === cleanQuery
    );

    if (matchedLocal) {
      setResolvedInstitute(matchedLocal);
      switchInstitute(matchedLocal.id);
    }

    // Always fetch latest institute data (including logo_url and status) from server
    fetch(`/api/institutes/${encodeURIComponent(instituteQuery)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.institute) {
          setResolvedInstitute(data.institute);
          switchInstitute(data.institute.id);
        }
      })
      .catch(() => {
        // Fallback already handled via matchedLocal
      })
      .finally(() => {
        setResolvingInstitute(false);
      });
  }, [instituteQuery, switchInstitute]);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const target = user.role === 'super_admin' ? '/super-admin' : '/dashboard';
      router.replace(target);
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Trap back navigation on login page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Handle Email & Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithEmail(email, password);
      if (result.success) {
        setSuccessMessage('Login successful! Redirecting...');
        setTimeout(() => {
          const target = email.toLowerCase().includes('super') ? '/super-admin' : '/dashboard';
          router.replace(target);
        }, 400);
      } else {
        setErrorMessage(result.message || 'Invalid email or password. Please try again.');
      }
    } catch {
      setErrorMessage('Failed to sign in. Please check your network and credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithPhone(phone);
      if (res.success) {
        setOtpStep('otp');
        setSuccessMessage(`OTP sent to +91 ${clean}`);
      } else {
        setErrorMessage(res.message || 'Failed to send OTP. Please check your number.');
      }
    } catch {
      setErrorMessage('Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (otp.length < 4) {
      setErrorMessage('Please enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(phone, otp);
      if (res.success) {
        setSuccessMessage('Verification successful! Redirecting...');
        setTimeout(() => {
          const savedRole = localStorage.getItem('classdesk_demo_role');
          const clean = phone.replace(/\D/g, '');
          const target =
            savedRole === 'super_admin' || clean === '9876543211'
              ? '/super-admin'
              : '/dashboard';
          router.replace(target);
        }, 400);
      } else {
        setErrorMessage(res.message || 'Invalid or expired OTP. Please try again.');
      }
    } catch {
      setErrorMessage('OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper accounts
  const fillCredentials = (type: 'admin' | 'teacher' | 'parent' | 'super_admin') => {
    setErrorMessage('');
    setSuccessMessage('');
    if (type === 'admin') {
      setAuthMode('email');
      setEmail('admin@classdesk.app');
      setPassword('admin123');
    } else if (type === 'teacher') {
      setAuthMode('email');
      setEmail('teacher@classdesk.app');
      setPassword('teacher123');
    } else if (type === 'super_admin') {
      setAuthMode('email');
      setEmail('superadmin@classdesk.app');
      setPassword('admin123');
    } else if (type === 'parent') {
      setAuthMode('otp');
      setOtpStep('phone');
      setPhone('9876543210');
      setOtp('123456');
    }
  };

  // Check if current resolved institute is suspended
  const isInstituteSuspended =
    resolvedInstitute &&
    (resolvedInstitute.status === 'suspended' ||
      resolvedInstitute.subscription_status === 'canceled');

  return (
    <div className="max-w-md mx-auto my-4 sm:my-10 px-2 sm:px-0 animate-in fade-in duration-300">
      {/* Brand Header */}
      <div className="text-center mb-6">
        {resolvingInstitute ? (
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : resolvedInstitute ? (
          /* Institute-Specific Branding */
          <div className="space-y-2">
            <div className="w-20 h-20 rounded-3xl bg-white p-2 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-indigo-100 border border-slate-200">
              {resolvedInstitute.logo_url ? (
                <img
                  src={resolvedInstitute.logo_url}
                  alt={resolvedInstitute.name}
                  className="w-full h-full object-contain rounded-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-indigo-600 text-white flex flex-col items-center justify-center font-black text-xl">
                  {resolvedInstitute.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Campus Portal Login</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {resolvedInstitute.name}
            </h1>

            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {resolvedInstitute.city
                ? `${resolvedInstitute.city}, ${resolvedInstitute.state || 'India'}`
                : 'Institute Management Portal'}
            </p>

            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-[11px] text-slate-400 hover:text-indigo-600 underline transition-colors"
            >
              Not your institute? Go to main login
            </button>
          </div>
        ) : (
          /* Default ClassDesk Global Platform Branding */
          <>
            {branding.logo_url ? (
              <div className="w-16 h-16 rounded-3xl bg-white p-2 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-indigo-100 border border-slate-200">
                <img
                  src={branding.logo_url}
                  alt={branding.name}
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center mx-auto mb-3 shadow-xl shadow-indigo-200">
                <GraduationCap className="w-9 h-9" />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {branding.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              {branding.tagline}
            </p>
          </>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 p-6 sm:p-8">
        {/* SUSPENSION NOTICE: If resolved institute is suspended, block login with clear notice */}
        {isInstituteSuspended ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Institute Account Suspended
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Access to the portal for{' '}
                <strong className="text-slate-900">{resolvedInstitute?.name}</strong> has
                been temporarily suspended by the platform administrator.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 text-left space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Data Protection Notice</span>
              </p>
              <p className="text-amber-800">
                All student profiles, academic marksheets, fee receipts, and attendance records
                remain safely preserved in the database.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to ClassDesk Main Login</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs: Email vs OTP */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('email');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'email'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Email & Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'otp'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Mobile OTP</span>
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* ---------------- MODE 1: EMAIL & PASSWORD ---------------- */}
            {authMode === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    {t('auth.emailLabel', 'Email Address')}
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@school.edu.in"
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      {t('auth.passwordLabel', 'Password')}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          'For password resets, contact your institute administrator or root super administrator.'
                        )
                      }
                      className="text-[11px] text-indigo-600 hover:underline font-semibold"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all min-h-[48px] disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ---------------- MODE 2: MOBILE OTP ---------------- */}
            {authMode === 'otp' && (
              <div>
                {otpStep === 'phone' ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        {t('auth.phoneLabel', 'Mobile Number')}
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-slate-600 bg-slate-200/80 px-2 py-1 rounded-lg">
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={phone}
                          onChange={(e) =>
                            setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                          }
                          placeholder={t(
                            'auth.phonePlaceholder',
                            'Enter 10-digit mobile number'
                          )}
                          className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Parents and teachers log in with their registered phone number.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all min-h-[48px] disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>{t('auth.getOtp', 'Send OTP')}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="text-center mb-1">
                      <p className="text-xs text-slate-500">
                        {t('auth.otpSent', 'OTP code sent to')}{' '}
                        <span className="font-bold text-slate-900">+91 {phone}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep('phone');
                          setErrorMessage('');
                        }}
                        className="text-[11px] text-indigo-600 font-bold hover:underline mt-0.5"
                      >
                        Change Mobile Number
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide text-center">
                        Enter 6-Digit OTP
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full text-center tracking-[0.45em] text-2xl font-bold py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        required
                      />
                      <p className="text-[11px] text-center text-slate-400 mt-1.5">
                        (Standard test OTP:{' '}
                        <span className="font-bold text-slate-600">123456</span>)
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all min-h-[48px] disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t('auth.verifyOtp', 'Verify & Sign In')}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Quick Test Credentials Helper */}
            <div className="mt-8 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Test Credentials
                </span>
                <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-fill form
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin')}
                  className="p-2 text-left bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all"
                >
                  <p className="text-[11px] font-bold text-slate-800">School Admin</p>
                  <p className="text-[10px] text-slate-500 font-mono">admin@classdesk.app</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('teacher')}
                  className="p-2 text-left bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all"
                >
                  <p className="text-[11px] font-bold text-slate-800">Teacher</p>
                  <p className="text-[10px] text-slate-500 font-mono">teacher@classdesk.app</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('parent')}
                  className="p-2 text-left bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 rounded-xl transition-all"
                >
                  <p className="text-[11px] font-bold text-slate-800">Parent (Phone OTP)</p>
                  <p className="text-[10px] text-slate-500 font-mono">+91 9876543210</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('super_admin')}
                  className="p-2 text-left bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-200 rounded-xl transition-all"
                >
                  <p className="text-[11px] font-bold text-slate-800">Super Admin</p>
                  <p className="text-[10px] text-slate-500 font-mono">superadmin@classdesk.app</p>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto my-12 p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs font-medium">Loading portal...</span>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
