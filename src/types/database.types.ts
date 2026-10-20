export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'super_admin' | 'institute_admin' | 'teacher' | 'parent';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day';
export type FeeFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'one_time';
export type FeeDueStatus = 'pending' | 'partial' | 'paid' | 'waived';
export type PaymentMethod = 'cash' | 'upi_qr' | 'bank_transfer' | 'razorpay';
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'refunded';
export type TargetAudience = 'all' | 'class' | 'batch';
export type NotificationType =
  | 'absent_alert'
  | 'fee_due'
  | 'fee_paid'
  | 'announcement'
  | 'new_notes'
  | 'timetable_change'
  | 'marks_published';

export interface InstituteRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  currency: string;
  timezone: string;
  subscription_plan: string;
  subscription_status: string;
  settings: {
    receipt_prefix?: string;
    late_fee_enabled?: boolean;
    late_fee_per_day?: number;
    grade_system?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  institute_id: string | null;
  role: UserRole;
  full_name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassRow {
  id: string;
  institute_id: string;
  name: string;
  section: string | null;
  academic_year: string;
  class_teacher_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentRow {
  id: string;
  institute_id: string;
  class_id: string;
  admission_number: string | null;
  roll_number: string | null;
  full_name: string;
  gender: 'male' | 'female' | 'other' | null;
  dob: string | null;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  address: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubjectRow {
  id: string;
  institute_id: string;
  class_id: string;
  name: string;
  code: string | null;
  teacher_id: string | null;
  created_at: string;
}

export interface TimetableRow {
  id: string;
  institute_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  created_at: string;
}

export interface NoteRow {
  id: string;
  institute_id: string;
  class_id: string;
  subject_id: string;
  uploaded_by: string | null;
  title: string;
  description: string | null;
  type: 'pdf' | 'image' | 'link' | 'doc';
  file_url: string;
  file_size_bytes: number | null;
  created_at: string;
}

export interface AnnouncementRow {
  id: string;
  institute_id: string;
  created_by: string | null;
  title: string;
  content: string;
  target_type: TargetAudience;
  target_class_id: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface AttendanceRow {
  id: string;
  institute_id: string;
  class_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
  marked_by: string | null;
  created_at: string;
}

export interface FeePlanRow {
  id: string;
  institute_id: string;
  class_id: string | null;
  name: string;
  amount: number;
  frequency: FeeFrequency;
  due_day_of_month: number;
  late_fine_amount: number;
  late_fine_grace_days: number;
  created_at: string;
}

export interface StudentFeeDueRow {
  id: string;
  institute_id: string;
  student_id: string;
  fee_plan_id: string;
  title: string;
  original_amount: number;
  discount_amount: number;
  fine_amount: number;
  paid_amount: number;
  due_date: string;
  status: FeeDueStatus;
  created_at: string;
}

export interface FeePaymentRow {
  id: string;
  institute_id: string;
  student_id: string;
  fee_due_id: string | null;
  receipt_number: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  collected_by: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  notes: string | null;
  receipt_pdf_url: string | null;
  paid_at: string;
  created_at: string;
}

export interface ExamRow {
  id: string;
  institute_id: string;
  class_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean;
  created_at: string;
}

export interface ExamSubjectRow {
  id: string;
  exam_id: string;
  subject_id: string;
  max_marks: number;
  pass_marks: number;
  exam_date: string | null;
}

export interface MarkRow {
  id: string;
  institute_id: string;
  exam_id: string;
  exam_subject_id: string;
  student_id: string;
  marks_obtained: number | null;
  is_absent: boolean;
  grade: string | null;
  remarks: string | null;
  entered_by: string | null;
  created_at: string;
}

export interface DeviceTokenRow {
  id: string;
  user_id: string | null;
  phone: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  institute_id: string;
  recipient_user_id: string | null;
  recipient_phone: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Json;
  is_read: boolean;
  created_at: string;
}

export interface NotificationSettingsRow {
  id: string;
  user_id: string | null;
  phone: string;
  absent_alert: boolean;
  fee_due: boolean;
  fee_paid: boolean;
  announcement: boolean;
  new_notes: boolean;
  timetable_change: boolean;
  marks_published: boolean;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      institutes: {
        Row: InstituteRow;
        Insert: Partial<InstituteRow>;
        Update: Partial<InstituteRow>;
      };
      users: {
        Row: UserRow;
        Insert: Partial<UserRow>;
        Update: Partial<UserRow>;
      };
      classes: {
        Row: ClassRow;
        Insert: Partial<ClassRow>;
        Update: Partial<ClassRow>;
      };
      students: {
        Row: StudentRow;
        Insert: Partial<StudentRow>;
        Update: Partial<StudentRow>;
      };
      subjects: {
        Row: SubjectRow;
        Insert: Partial<SubjectRow>;
        Update: Partial<SubjectRow>;
      };
      timetable: {
        Row: TimetableRow;
        Insert: Partial<TimetableRow>;
        Update: Partial<TimetableRow>;
      };
      notes: {
        Row: NoteRow;
        Insert: Partial<NoteRow>;
        Update: Partial<NoteRow>;
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: Partial<AnnouncementRow>;
        Update: Partial<AnnouncementRow>;
      };
      attendance: {
        Row: AttendanceRow;
        Insert: Partial<AttendanceRow>;
        Update: Partial<AttendanceRow>;
      };
      fee_plans: {
        Row: FeePlanRow;
        Insert: Partial<FeePlanRow>;
        Update: Partial<FeePlanRow>;
      };
      student_fee_dues: {
        Row: StudentFeeDueRow;
        Insert: Partial<StudentFeeDueRow>;
        Update: Partial<StudentFeeDueRow>;
      };
      fee_payments: {
        Row: FeePaymentRow;
        Insert: Partial<FeePaymentRow>;
        Update: Partial<FeePaymentRow>;
      };
      exams: {
        Row: ExamRow;
        Insert: Partial<ExamRow>;
        Update: Partial<ExamRow>;
      };
      exam_subjects: {
        Row: ExamSubjectRow;
        Insert: Partial<ExamSubjectRow>;
        Update: Partial<ExamSubjectRow>;
      };
      marks: {
        Row: MarkRow;
        Insert: Partial<MarkRow>;
        Update: Partial<MarkRow>;
      };
      device_tokens: {
        Row: DeviceTokenRow;
        Insert: Partial<DeviceTokenRow>;
        Update: Partial<DeviceTokenRow>;
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow>;
        Update: Partial<NotificationRow>;
      };
      notification_settings: {
        Row: NotificationSettingsRow;
        Insert: Partial<NotificationSettingsRow>;
        Update: Partial<NotificationSettingsRow>;
      };
    };
  };
}
