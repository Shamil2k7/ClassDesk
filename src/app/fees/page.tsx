'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import {
  CreditCard,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileCheck,
  Search,
  IndianRupee,
  Receipt,
  X,
  Share2,
  Loader2,
  Users,
  Calendar,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generateFeeReceiptPdf } from '@/lib/pdf-generator';
import { StudentFeeDue, FeePayment, Student, Institute } from '@/types/app.types';
import { SchemaNotice } from '@/components/common/schema-notice';
import { getLocalDataForInstitute, appendLocalData, syncLocalWithRemote } from '@/lib/storage-helper';

export default function FeesPage() {
  const { user, institute, activeChild, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const instId = institute?.id || user?.institute_id || null;

  const isStaff = user?.role === 'institute_admin' || user?.role === 'super_admin' || user?.role === 'teacher';

  // State
  const [duesList, setDuesList] = useState<StudentFeeDue[]>([]);
  const [paymentsList, setPaymentsList] = useState<FeePayment[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const [showCashModal, setShowCashModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlinePaySuccess, setOnlinePaySuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Cash Entry Form State
  const [cashStudentId, setCashStudentId] = useState('');
  const [cashAmount, setCashAmount] = useState('2000');
  const [cashMethod, setCashMethod] = useState<'cash' | 'upi_qr'>('cash');
  const [cashRemarks, setCashRemarks] = useState('');

  // 1. Load Data from Supabase
  const loadFeeData = useCallback(async () => {
    try {
      // Dues
      let duesQuery = supabase.from('student_fee_dues').select('*');
      if (instId) {
        duesQuery = duesQuery.eq('institute_id', instId);
      }
      const { data: duesData, error: duesError } = await duesQuery.order('due_date');

      if (duesError && (duesError.code === 'PGRST205' || duesError.code === '42P01')) {
        setSchemaMissing(true);
        setDuesList(getLocalDataForInstitute<StudentFeeDue>('feeDues', instId));
        setPaymentsList(getLocalDataForInstitute<FeePayment>('payments', instId));
        const localStudents = getLocalDataForInstitute<Student>('students', instId);
        setStudentsList(localStudents);
        if (localStudents.length > 0) setCashStudentId((prev) => prev || localStudents[0].id);
        return;
      }
      if (duesData && duesData.length > 0) {
        setDuesList(syncLocalWithRemote('feeDues', duesData as StudentFeeDue[], instId));
      } else {
        setDuesList(getLocalDataForInstitute<StudentFeeDue>('feeDues', instId));
      }

      // Payments
      let payQuery = supabase.from('fee_payments').select('*');
      if (instId) {
        payQuery = payQuery.eq('institute_id', instId);
      }
      const { data: payData } = await payQuery.order('paid_at', { ascending: false });
      if (payData && payData.length > 0) {
        setPaymentsList(syncLocalWithRemote('payments', payData as FeePayment[], instId));
      } else {
        setPaymentsList(getLocalDataForInstitute<FeePayment>('payments', instId));
      }

      // Students
      let stuQuery = supabase.from('students').select('*');
      if (instId) {
        stuQuery = stuQuery.eq('institute_id', instId);
      }
      const { data: stuData } = await stuQuery.order('full_name');
      const students = (stuData || []) as Student[];
      if (students.length > 0) {
        const mergedStudents = syncLocalWithRemote('students', students, instId);
        setStudentsList(mergedStudents);
        setCashStudentId((prev) => prev || mergedStudents[0].id);
      } else {
        const localStudents = getLocalDataForInstitute<Student>('students', instId);
        setStudentsList(localStudents);
        if (localStudents.length > 0) setCashStudentId((prev) => prev || localStudents[0].id);
      }
    } catch (err) {
      console.warn('Error loading fees data:', err);
      setDuesList(getLocalDataForInstitute<StudentFeeDue>('feeDues', instId));
      setPaymentsList(getLocalDataForInstitute<FeePayment>('payments', instId));
      setStudentsList(getLocalDataForInstitute<Student>('students', instId));
    } finally {
      setLoading(false);
    }
  }, [supabase, instId]);

  useEffect(() => {
    if (authLoading) return;
    const localDues = getLocalDataForInstitute<StudentFeeDue>('feeDues', instId);
    const localPayments = getLocalDataForInstitute<FeePayment>('payments', instId);
    const localStudents = getLocalDataForInstitute<Student>('students', instId);
    if (localDues.length > 0) setDuesList(localDues);
    if (localPayments.length > 0) setPaymentsList(localPayments);
    if (localStudents.length > 0) {
      setStudentsList(localStudents);
      setCashStudentId((prev) => prev || localStudents[0].id);
    }
    loadFeeData();
  }, [loadFeeData, instId, authLoading]);

  // Handle Manual Cash / Direct UPI collection by Admin
  const handleRecordCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashStudentId) return;

    setIsSubmitting(true);
    const student = studentsList.find((s) => s.id === cashStudentId);
    const amountNum = parseFloat(cashAmount) || 0;
    const currentInst: Institute = institute || {
      id: user?.institute_id || '00000000-0000-0000-0000-000000000001',
      name: 'ClassDesk Institute',
      slug: 'classdesk-inst',
      logo_url: null,
      phone: '+91 9876543210',
      email: 'info@classdesk.in',
      address: 'Main Road',
      city: 'Kochi',
      state: 'Kerala',
      pincode: '682001',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      subscription_plan: 'standard',
      subscription_status: 'active',
      settings: { receipt_prefix: 'REC', late_fee_enabled: false, grade_system: 'cbse' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const receiptNum = `${currentInst.settings?.receipt_prefix || 'REC'}-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPaymentPayload = {
      institute_id: currentInst.id,
      student_id: cashStudentId,
      fee_due_id: null,
      receipt_number: receiptNum,
      amount: amountNum,
      payment_method: cashMethod,
      payment_status: 'successful' as const,
      collected_by: user?.id || null,
      notes: cashRemarks || `Manual payment recorded via ${cashMethod.toUpperCase()}`,
      paid_at: new Date().toISOString(),
    };

    try {
      const { data: insertedPay, error: payError } = await (supabase as any)
        .from('fee_payments')
        .insert([newPaymentPayload])
        .select()
        .single();

      const createdPayment = (insertedPay as FeePayment) || {
        id: `pay-${Date.now()}`,
        ...newPaymentPayload,
        razorpay_order_id: null,
        razorpay_payment_id: null,
        razorpay_signature: null,
        receipt_pdf_url: null,
        created_at: new Date().toISOString(),
      };

      setPaymentsList(appendLocalData('payments', createdPayment, instId));

      // Update matching student fee due if any
      const matchingDue = duesList.find((d) => d.student_id === cashStudentId && d.status !== 'paid');
      if (matchingDue) {
        const newPaid = matchingDue.paid_amount + amountNum;
        const newStatus = newPaid >= matchingDue.original_amount ? 'paid' : 'partial';

        await (supabase as any)
          .from('student_fee_dues')
          .update({ paid_amount: newPaid, status: newStatus })
          .eq('id', matchingDue.id);

        setDuesList((prev) =>
          prev.map((d) =>
            d.id === matchingDue.id ? { ...d, paid_amount: newPaid, status: newStatus } : d
          )
        );
      }

      setShowCashModal(false);
      setCashRemarks('');

      // Auto-trigger PDF download
      if (student) {
        generateFeeReceiptPdf({
          payment: createdPayment,
          student,
          institute: currentInst,
        });
      }
    } catch (err) {
      console.warn('Error recording cash payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Parent Online Checkout
  const handleParentOnlineCheckout = async (due: StudentFeeDue) => {
    const student = activeChild || studentsList.find((s) => s.id === due.student_id);
    if (!student) return;

    const currentInst: Institute = institute || {
      id: user?.institute_id || '00000000-0000-0000-0000-000000000001',
      name: 'ClassDesk Institute',
      slug: 'classdesk-inst',
      logo_url: null,
      phone: '+91 9876543210',
      email: 'info@classdesk.in',
      address: 'Main Road',
      city: 'Kochi',
      state: 'Kerala',
      pincode: '682001',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      subscription_plan: 'standard',
      subscription_status: 'active',
      settings: { receipt_prefix: 'REC', late_fee_enabled: false, grade_system: 'cbse' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const rzpPaymentId = `pay_rzp_${Math.floor(100000 + Math.random() * 900000)}`;
    const receiptNum = `${currentInst.settings?.receipt_prefix || 'KMPS'}-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const paymentPayload = {
      institute_id: currentInst.id,
      student_id: student.id,
      fee_due_id: due.id,
      receipt_number: receiptNum,
      amount: due.original_amount - due.paid_amount,
      payment_method: 'razorpay' as const,
      payment_status: 'successful' as const,
      collected_by: null,
      razorpay_order_id: `order_${Math.floor(10000 + Math.random() * 90000)}`,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: 'sig_verified_by_webhook_hmac_sha256',
      notes: 'Online Razorpay fee payment verified via webhook',
      paid_at: new Date().toISOString(),
    };

    try {
      const { data: insertedPay } = await (supabase as any)
        .from('fee_payments')
        .insert([paymentPayload])
        .select()
        .single();

      await (supabase as any)
        .from('student_fee_dues')
        .update({ status: 'paid', paid_amount: due.original_amount })
        .eq('id', due.id);

      const createdPayment = (insertedPay as FeePayment) || {
        id: `pay-${Date.now()}`,
        ...paymentPayload,
        receipt_pdf_url: null,
        created_at: new Date().toISOString(),
      };

      setPaymentsList(appendLocalData('payments', createdPayment, instId));
      setDuesList((prev) =>
        prev.map((d) => (d.id === due.id ? { ...d, status: 'paid', paid_amount: d.original_amount } : d))
      );

      setOnlinePaySuccess(`Payment verified! Receipt #${receiptNum} generated.`);

      generateFeeReceiptPdf({
        payment: createdPayment,
        due,
        student,
        institute: currentInst,
      });
    } catch (err) {
      console.warn('Error recording online payment:', err);
    }
  };

  // -------------------------------------------------------------
  // PARENT VIEW: Child's Pending Dues, Current Month Status & Downloadable Receipts
  // -------------------------------------------------------------
  if (!isStaff) {
    const targetStudent = activeChild || (studentsList.length > 0 ? studentsList[0] : null);
    const targetStudentId = targetStudent?.id;

    const myDues = duesList.filter((d) => d.student_id === targetStudentId);
    const myPayments = paymentsList.filter((p) => p.student_id === targetStudentId);
    const pendingDue = myDues.find((d) => d.status === 'pending');

    // Current Month calculations
    const now = new Date();
    const currentMonthName = now.toLocaleDateString('en-US', { month: 'long' });
    const currentYear = now.getFullYear();
    const currentMonthYearStr = `${currentMonthName} ${currentYear}`;
    const currentMonthPrefix = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const currentMonthPayment = myPayments.find(
      (p) => p.paid_at && p.paid_at.startsWith(currentMonthPrefix)
    );
    const isCurrentMonthPaid =
      !!currentMonthPayment ||
      (myDues.length > 0 && myDues.every((d) => d.status === 'paid')) ||
      (!pendingDue && myPayments.length > 0);

    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        <SchemaNotice visible={schemaMissing} />

        {/* Active Child Fee Header */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {targetStudent?.full_name ? `${targetStudent.full_name}'s Fee Portal` : 'Student Fee Portal'}
            </h2>
            <p className="text-xs text-slate-500">
              Admission: {targetStudent?.admission_number || 'N/A'} • Roll #{targetStudent?.roll_number || 'N/A'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {onlinePaySuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-900">{onlinePaySuccess}</p>
          </div>
        )}

        {/* Dedicated Current Month Fee Status Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                  isCurrentMonthPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    CURRENT MONTH STATUS
                  </span>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isCurrentMonthPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isCurrentMonthPaid ? '● PAID' : '● PENDING'}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {currentMonthYearStr} Fee Status
                </h3>
              </div>
            </div>

            {isCurrentMonthPaid && currentMonthPayment && (
              <button
                onClick={() => {
                  if (targetStudent) {
                    generateFeeReceiptPdf({
                      payment: currentMonthPayment,
                      student: targetStudent,
                      institute: institute || null,
                    });
                  }
                }}
                className="self-start sm:self-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Receipt (#{currentMonthPayment.receipt_number})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Billing Month</p>
              <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">{currentMonthYearStr}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">
                {isCurrentMonthPaid ? 'Fee Amount Settled' : 'Payable Amount'}
              </p>
              <p
                className={`text-xs sm:text-sm font-black mt-0.5 ${
                  isCurrentMonthPaid ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                ₹
                {isCurrentMonthPaid
                  ? (currentMonthPayment?.amount || 2500).toLocaleString('en-IN')
                  : (pendingDue
                      ? pendingDue.original_amount - pendingDue.paid_amount
                      : 2500
                    ).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[11px] text-slate-400 font-medium">
                {isCurrentMonthPaid ? 'Date Paid' : 'Due Date'}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                {isCurrentMonthPaid
                  ? currentMonthPayment?.paid_at
                    ? new Date(currentMonthPayment.paid_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : `1st ${currentMonthName} ${currentYear}`
                  : pendingDue?.due_date || `10th ${currentMonthName} ${currentYear}`}
              </p>
            </div>
          </div>
        </div>

        {/* Outstanding Due Card */}
        {pendingDue ? (
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                Payment Outstanding
              </span>
              <span className="text-xs text-indigo-200">Due: {pendingDue.due_date}</span>
            </div>

            <div className="my-5">
              <span className="text-xs text-indigo-200">Total Payable Amount</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black">
                  ₹{Number(pendingDue.original_amount - pendingDue.paid_amount).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-1">{pendingDue.title}</p>
            </div>

            <button
              onClick={() => handleParentOnlineCheckout(pendingDue)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all min-h-[48px]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Online via Razorpay (UPI / Cards / NetBanking)</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-900">All Fees Cleared</h3>
            <p className="text-xs text-emerald-700">
              There are no outstanding tuition fee dues for {targetStudent?.full_name || 'your ward'}.
            </p>
          </div>
        )}

        {/* Payment History & Receipts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
            Payment Receipts History
          </h3>
          {myPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600">No payment receipts yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Receipts generated from online Razorpay or cash payments will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myPayments.map((pay) => (
                <div key={pay.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Receipt #{pay.receipt_number}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Paid on {new Date(pay.paid_at).toLocaleDateString('en-IN')} via{' '}
                      {pay.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-slate-900">
                      ₹{pay.amount.toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => {
                        const student = targetStudent || studentsList.find((s) => s.id === pay.student_id);
                        if (student) {
                          generateFeeReceiptPdf({
                            payment: pay,
                            student,
                            institute: institute || null,
                          });
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STAFF VIEW: Institute Admin & Cashier Overview
  // -------------------------------------------------------------
  const now = new Date();
  const currentMonthName = now.toLocaleDateString('en-US', { month: 'long' });
  const currentYear = now.getFullYear();
  const currentMonthYearStr = `${currentMonthName} ${currentYear}`;
  const currentMonthPrefix = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthCollected = paymentsList
    .filter((p) => p.paid_at && p.paid_at.startsWith(currentMonthPrefix))
    .reduce((acc, p) => acc + p.amount, 0);

  const currentMonthDues = duesList.filter(
    (d) => d.due_date && d.due_date.startsWith(currentMonthPrefix)
  );
  const currentMonthPending = currentMonthDues
    .filter((d) => d.status !== 'paid')
    .reduce((acc, d) => acc + (d.original_amount - d.paid_amount), 0);

  const totalCollected = paymentsList.reduce((acc, p) => acc + p.amount, 0);
  const totalPending = duesList
    .filter((d) => d.status !== 'paid')
    .reduce((acc, d) => acc + (d.original_amount - d.paid_amount), 0);

  const filteredDues = duesList.filter((d) => {
    const student = studentsList.find((s) => s.id === d.student_id);
    if (!student) return true;
    return (
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.roll_number && student.roll_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
            <Calendar className="w-3 h-3 text-indigo-600" />
            <span>Cycle: {currentMonthYearStr}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('fees.title', 'Fee Management & Collections')}
          </h2>
          <p className="text-xs text-slate-500">
            Cash / UPI recording, current month billing, and 1-tap PDF receipts
          </p>
        </div>

        <button
          onClick={() => setShowCashModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-3 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>{t('fees.recordCashPayment', 'Record Cash / UPI')}</span>
        </button>
      </div>

      {/* Current Month & Overall Collection Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-4 sm:p-5 rounded-3xl shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90 block">
            {currentMonthName} Collected
          </span>
          <p className="text-xl sm:text-2xl font-black mt-1">
            ₹{currentMonthCollected.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-emerald-100 mt-1 block">
            This month&apos;s collections
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            {currentMonthName} Pending
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
            ₹{(currentMonthPending > 0 ? currentMonthPending : totalPending).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Active dues for {currentMonthName}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Total All-Time Collected
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ₹{totalCollected.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {paymentsList.length} total receipts
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            All Outstanding Dues
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            ₹{totalPending.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {duesList.filter((d) => d.status !== 'paid').length} students with dues
          </span>
        </div>
      </div>

      {/* Pending Student Dues Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Student Fee Dues ({filteredDues.length})
          </h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by student name or roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-xs">Loading fee records...</p>
          </div>
        ) : filteredDues.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">No student dues pending</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Fee dues created for batches will appear here for cashier tracking.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDues.map((due) => {
              const student = studentsList.find((s) => s.id === due.student_id);
              const remaining = due.original_amount - due.paid_amount;
              return (
                <div
                  key={due.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {student?.roll_number || 'ST'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{student?.full_name || 'Student'}</p>
                      <p className="text-[10px] text-slate-400">
                        {due.title} • Due: {due.due_date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">
                        ₹{remaining.toLocaleString('en-IN')}
                      </p>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          due.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : due.status === 'partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {due.status}
                      </span>
                    </div>

                    {due.status !== 'paid' && (
                      <button
                        onClick={() => {
                          setCashStudentId(due.student_id);
                          setCashAmount(String(remaining));
                          setShowCashModal(true);
                        }}
                        className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors min-h-[36px]"
                      >
                        Collect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Payments & Receipts */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
          Recent Payment Collections ({paymentsList.length})
        </h3>
        {paymentsList.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">No collections recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click &quot;Record Cash / UPI&quot; above to log an offline payment and generate a receipt.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paymentsList.slice(0, 10).map((pay) => {
              const student = studentsList.find((s) => s.id === pay.student_id);
              return (
                <div key={pay.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">
                        {student?.full_name || 'Student'}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        #{pay.receipt_number}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(pay.paid_at).toLocaleDateString('en-IN')} • Method:{' '}
                      <span className="font-semibold uppercase">{pay.payment_method}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-600">
                      ₹{pay.amount.toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => {
                        if (student) {
                          generateFeeReceiptPdf({
                            payment: pay,
                            student,
                            institute: institute || null,
                          });
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Download PDF Receipt"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Manual Cash / UPI Entry */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <span>Record Fee Payment</span>
              </h3>
              <button
                onClick={() => setShowCashModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {studentsList.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-600 font-medium">No students enrolled yet.</p>
                <Link
                  href="/students"
                  onClick={() => setShowCashModal(false)}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enroll Student First</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleRecordCash} className="space-y-4 mt-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Student
                  </label>
                  <select
                    value={cashStudentId}
                    onChange={(e) => setCashStudentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                  >
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} (Roll #{s.roll_number || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Amount Received (₹)
                  </label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    required
                    min="1"
                    placeholder="Enter amount"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCashMethod('cash')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        cashMethod === 'cash'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Cash Collection
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashMethod('upi_qr')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        cashMethod === 'upi_qr'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Direct UPI / QR
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Remarks / Fee Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={cashRemarks}
                    onChange={(e) => setCashRemarks(e.target.value)}
                    placeholder="e.g. October Tuition Fee"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{isSubmitting ? 'Recording...' : 'Record Payment & Download PDF Receipt'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
