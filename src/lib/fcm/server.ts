import { NotificationType } from '@/types/database.types';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PushNotificationPayload {
  instituteId: string;
  recipientPhone: string;
  recipientUserId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Server-side notification dispatcher
 * Respects user preferences in notification_settings
 */
export async function dispatchNotification(payload: PushNotificationPayload) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = createAdminClient() as any;

    // 1. Check user notification settings
    const { data: settings } = await supabaseAdmin
      .from('notification_settings')
      .select('*')
      .eq('phone', payload.recipientPhone)
      .maybeSingle();

    if (settings) {
      // If user turned off this specific notification type, exit early
      const isAllowed = settings[payload.type as keyof typeof settings];
      if (isAllowed === false) {
        return { skipped: true, reason: 'User opted out of this notification type' };
      }
    }

    // 2. Persist in database notifications table so parent never misses alerts even if offline
    const { data: savedNotif, error: dbError } = await supabaseAdmin
      .from('notifications')
      .insert({
        institute_id: payload.instituteId,
        recipient_user_id: payload.recipientUserId || null,
        recipient_phone: payload.recipientPhone,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        is_read: false,
      })
      .select('id')
      .single();

    if (dbError) {
      console.warn('DB notification insert warning:', dbError.message);
    }

    // 3. Query device tokens for web push
    const { data: tokens } = await supabaseAdmin
      .from('device_tokens')
      .select('token')
      .eq('phone', payload.recipientPhone);

    if (tokens && tokens.length > 0) {
      // In production with Firebase Admin credentials configured:
      // admin.messaging().sendEachForMulticast({ tokens: tokens.map((t: any) => t.token), notification: { ... } });
    }

    return { success: true, notificationId: savedNotif?.id };
  } catch (err) {
    console.error('Failed to dispatch notification:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown' };
  }
}
