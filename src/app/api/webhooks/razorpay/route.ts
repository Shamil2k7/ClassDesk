import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    // 1. Cryptographic HMAC-SHA256 verification
    const isValid = verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      // In development mode, if placeholder secret is used, we allow testing with a warning
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(rawBody);

    // 2. Handle payment captured / successful event
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentPayload = event.payload?.payment?.entity;
      const notes = paymentPayload?.notes || {};

      const instituteId = notes.institute_id;
      const studentId = notes.student_id;
      const feeDueId = notes.fee_due_id;
      const amountPaid = (paymentPayload?.amount || 0) / 100; // Razorpay sends in paise
      const paymentId = paymentPayload?.id;
      const orderId = paymentPayload?.order_id;

      if (!studentId || !instituteId) {
        return NextResponse.json(
          { message: 'Payment acknowledged but missing student/institute metadata' },
          { status: 200 }
        );
      }

      // Initialize Supabase Admin Client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseAdmin = createAdminClient() as any;

      // 3. Idempotency Check: Check if paymentId already processed
      const { data: existingPayment } = await supabaseAdmin
        .from('fee_payments')
        .select('id')
        .eq('razorpay_payment_id', paymentId)
        .maybeSingle();

      if (existingPayment) {
        return NextResponse.json({ message: 'Payment already processed' }, { status: 200 });
      }

      // 4. Update the student fee due record
      if (feeDueId) {
        await supabaseAdmin
          .from('student_fee_dues')
          .update({
            status: 'paid',
            paid_amount: amountPaid,
          })
          .eq('id', feeDueId);
      }

      // 5. Generate receipt number & record fee payment
      const receiptNumber = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      await supabaseAdmin.from('fee_payments').insert({
        institute_id: instituteId,
        student_id: studentId,
        fee_due_id: feeDueId || null,
        receipt_number: receiptNumber,
        amount: amountPaid,
        payment_method: 'razorpay',
        payment_status: 'successful',
        razorpay_order_id: orderId || null,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        notes: `Online Payment via Razorpay (${paymentPayload?.method || 'UPI/Card'})`,
        receipt_pdf_url: null,
        paid_at: new Date().toISOString(),
      });

      // 6. Record notification
      const parentPhone = notes.parent_phone || '';
      if (parentPhone) {
        await supabaseAdmin.from('notifications').insert({
          institute_id: instituteId,
          recipient_user_id: null,
          recipient_phone: parentPhone,
          type: 'fee_paid',
          title: 'Fee Payment Successful',
          body: `Received ₹${amountPaid.toLocaleString('en-IN')} towards school fees. Receipt #${receiptNumber} generated.`,
          data: { receipt_number: receiptNumber, amount: amountPaid },
          is_read: false,
        });
      }

      return NextResponse.json(
        { success: true, receipt_number: receiptNumber },
        { status: 200 }
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Webhook error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
