import crypto from 'crypto';

export function getRazorpayCredentials() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret';

  return { keyId, keySecret, webhookSecret };
}

/**
 * Verify client payment signature (Order ID + Payment ID)
 */
export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getRazorpayCredentials();
  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const generatedBuffer = Buffer.from(generatedSignature, 'utf-8');
  const signatureBuffer = Buffer.from(signature, 'utf-8');

  if (generatedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(generatedBuffer, signatureBuffer);
}

/**
 * Verify Razorpay Webhook Signature using HMAC-SHA256
 * Razorpay passes the signature in header `x-razorpay-signature`
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): boolean {
  const { webhookSecret } = getRazorpayCredentials();
  if (!signature || !webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
  const signatureBuffer = Buffer.from(signature, 'utf-8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
