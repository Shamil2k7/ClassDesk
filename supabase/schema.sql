-- ==============================================================================
-- CLASSDESK PRODUCTION DATABASE SCHEMA
-- Target: PostgreSQL 15+ (Supabase)
-- Multi-Tenancy Architecture: Shared Database, Shared Schema with Row Level Security (RLS)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'institute_admin',
  'teacher',
  'parent'
);

CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'late',
  'half_day'
);

CREATE TYPE public.fee_frequency AS ENUM (
  'monthly',
  'quarterly',
  'half_yearly',
  'annual',
  'one_time'
);

CREATE TYPE public.fee_due_status AS ENUM (
  'pending',
  'partial',
  'paid',
  'waived'
);

CREATE TYPE public.payment_method AS ENUM (
  'cash',
  'upi_qr',
  'bank_transfer',
  'razorpay'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'successful',
  'failed',
  'refunded'
);

CREATE TYPE public.target_audience AS ENUM (
  'all',
  'class',
  'batch'
);

CREATE TYPE public.notification_type AS ENUM (
  'absent_alert',
  'fee_due',
  'fee_paid',
  'announcement',
  'new_notes',
  'timetable_change',
  'marks_published'
);

-- ==============================================================================
-- 3. CORE MULTI-TENANT TABLES
-- ==============================================================================

-- 3.1 INSTITUTES (Tenants)
CREATE TABLE public.institutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'Kerala',
  pincode TEXT,
  currency TEXT DEFAULT 'INR',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  subscription_plan TEXT DEFAULT 'standard',
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled')),
  settings JSONB DEFAULT '{
    "late_fee_enabled": false,
    "late_fee_per_day": 10,
    "receipt_prefix": "REC",
    "grade_system": "cbse"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3.2 USERS / PROFILES (Maps to auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT check_institute_for_staff CHECK (
    (role = 'super_admin' AND institute_id IS NULL) OR
    (role <> 'super_admin' AND institute_id IS NOT NULL) OR
    (role = 'parent')
  )
);

-- 3.3 CLASSES / BATCHES
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section TEXT DEFAULT 'A',
  academic_year TEXT NOT NULL,
  class_teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(institute_id, name, section, academic_year)
);

-- 3.4 STUDENTS
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  admission_number TEXT,
  roll_number TEXT,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  dob DATE,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  address TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(institute_id, admission_number)
);

-- 3.5 SUBJECTS
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(class_id, name)
);

-- 3.6 TIMETABLE
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT check_timetable_times CHECK (end_time > start_time)
);

-- 3.7 STUDY MATERIAL & NOTES
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'image', 'link', 'doc')),
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3.8 ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_type public.target_audience NOT NULL DEFAULT 'all',
  target_class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3.9 ATTENDANCE
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  remarks TEXT,
  marked_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(student_id, date)
);

-- 3.10 FEE PLANS
CREATE TABLE public.fee_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  frequency public.fee_frequency NOT NULL,
  due_day_of_month INT DEFAULT 10 CHECK (due_day_of_month BETWEEN 1 AND 31),
  late_fine_amount NUMERIC(10, 2) DEFAULT 0 CHECK (late_fine_amount >= 0),
  late_fine_grace_days INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3.11 STUDENT FEE DUES
CREATE TABLE public.student_fee_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_plan_id UUID NOT NULL REFERENCES public.fee_plans(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  original_amount NUMERIC(10, 2) NOT NULL CHECK (original_amount >= 0),
  discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  fine_amount NUMERIC(10, 2) DEFAULT 0 CHECK (fine_amount >= 0),
  paid_amount NUMERIC(10, 2) DEFAULT 0 CHECK (paid_amount >= 0),
  due_date DATE NOT NULL,
  status public.fee_due_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3.12 FEE PAYMENTS
CREATE TABLE public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  fee_due_id UUID REFERENCES public.student_fee_dues(id) ON DELETE SET NULL,
  receipt_number TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method public.payment_method NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  collected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  notes TEXT,
  receipt_pdf_url TEXT,
  paid_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(institute_id, receipt_number)
);

-- 3.13 EXAMS
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_published BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3.14 EXAM SUBJECTS
CREATE TABLE public.exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  max_marks NUMERIC(6, 2) NOT NULL DEFAULT 100 CHECK (max_marks > 0),
  pass_marks NUMERIC(6, 2) NOT NULL DEFAULT 35 CHECK (pass_marks >= 0),
  exam_date DATE,
  UNIQUE(exam_id, subject_id)
);

-- 3.15 MARKS
CREATE TABLE public.marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  exam_subject_id UUID NOT NULL REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(6, 2),
  is_absent BOOLEAN DEFAULT false NOT NULL,
  grade TEXT,
  remarks TEXT,
  entered_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(exam_subject_id, student_id)
);

-- 3.16 DEVICE TOKENS
CREATE TABLE public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3.17 NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3.18 NOTIFICATION SETTINGS
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  absent_alert BOOLEAN DEFAULT true NOT NULL,
  fee_due BOOLEAN DEFAULT true NOT NULL,
  fee_paid BOOLEAN DEFAULT true NOT NULL,
  announcement BOOLEAN DEFAULT true NOT NULL,
  new_notes BOOLEAN DEFAULT true NOT NULL,
  timetable_change BOOLEAN DEFAULT true NOT NULL,
  marks_published BOOLEAN DEFAULT true NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 4. PERFORMANCE & TENANT INDEXES
-- ==============================================================================
CREATE INDEX idx_users_institute ON public.users(institute_id);
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_classes_institute ON public.classes(institute_id);
CREATE INDEX idx_students_institute ON public.students(institute_id);
CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_students_parent_phone ON public.students(parent_phone);
CREATE INDEX idx_attendance_search ON public.attendance(institute_id, class_id, date);
CREATE INDEX idx_attendance_student ON public.attendance(student_id);
CREATE INDEX idx_timetable_lookup ON public.timetable(institute_id, class_id, day_of_week);
CREATE INDEX idx_timetable_teacher ON public.timetable(teacher_id);
CREATE INDEX idx_notes_class_subject ON public.notes(class_id, subject_id);
CREATE INDEX idx_announcements_feed ON public.announcements(institute_id, target_type, target_class_id);
CREATE INDEX idx_dues_student_status ON public.student_fee_dues(student_id, status);
CREATE INDEX idx_payments_lookup ON public.fee_payments(institute_id, student_id, payment_status);
CREATE INDEX idx_marks_exam_student ON public.marks(exam_id, student_id);
CREATE INDEX idx_notifications_phone ON public.notifications(recipient_phone, is_read);
CREATE INDEX idx_device_tokens_phone ON public.device_tokens(phone);

-- ==============================================================================
-- 5. RLS SECURITY DEFINER HELPER FUNCTIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1),
    'institute_admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_institute_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT institute_id FROM public.users WHERE id = auth.uid() LIMIT 1),
    '00000000-0000-0000-0000-000000000001'::uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role = 'super_admin' FROM public.users WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_phone()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.phone', true), ''),
    (SELECT phone FROM public.users WHERE id = auth.uid() LIMIT 1),
    (SELECT phone FROM auth.users WHERE id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = p_student_id 
    AND (
      parent_phone = public.current_user_phone()
      OR right(parent_phone, 10) = right(public.current_user_phone(), 10)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_parent_student_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.students 
  WHERE parent_phone = public.current_user_phone()
  OR right(parent_phone, 10) = right(public.current_user_phone(), 10);
$$;

CREATE OR REPLACE FUNCTION public.get_parent_class_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT class_id FROM public.students 
  WHERE parent_phone = public.current_user_phone()
  OR right(parent_phone, 10) = right(public.current_user_phone(), 10);
$$;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- 6.1 INSTITUTES
CREATE POLICY "Super Admins have full access to institutes"
  ON public.institutes FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Users can view their own institute"
  ON public.institutes FOR SELECT
  USING (
    id = public.current_user_institute_id()
    OR id IN (
      SELECT institute_id FROM public.students 
      WHERE parent_phone = public.current_user_phone()
      OR right(parent_phone, 10) = right(public.current_user_phone(), 10)
    )
  );

CREATE POLICY "Institute Admins can update their own institute"
  ON public.institutes FOR UPDATE
  USING (id = public.current_user_institute_id() AND public.current_user_role() = 'institute_admin')
  WITH CHECK (id = public.current_user_institute_id() AND public.current_user_role() = 'institute_admin');

-- 6.2 USERS / PROFILES
CREATE POLICY "Super Admins have full access to users"
  ON public.users FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Institute staff can view all profiles in their institute"
  ON public.users FOR SELECT
  USING (
    institute_id IS NOT NULL 
    AND institute_id = public.current_user_institute_id()
  );

CREATE POLICY "Institute Admins can manage staff in their institute"
  ON public.users FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() = 'institute_admin'
    AND role IN ('teacher', 'institute_admin')
  );

-- 6.3 CLASSES
CREATE POLICY "Super Admin access for classes"
  ON public.classes FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Institute staff can manage classes"
  ON public.classes FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() IN ('institute_admin', 'teacher')
  );

CREATE POLICY "Parents and students can view their enrolled classes"
  ON public.classes FOR SELECT
  USING (id IN (SELECT public.get_parent_class_ids()));

-- 6.4 STUDENTS
CREATE POLICY "Super Admin access for students"
  ON public.students FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Institute staff can view all students in their institute"
  ON public.students FOR SELECT
  USING (institute_id = public.current_user_institute_id());

CREATE POLICY "Institute Admins can insert/update/delete students"
  ON public.students FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() = 'institute_admin'
  );

CREATE POLICY "Parents can view only their linked children"
  ON public.students FOR SELECT
  USING (
    parent_phone = public.current_user_phone()
    OR right(parent_phone, 10) = right(public.current_user_phone(), 10)
  );

-- 6.5 SUBJECTS
CREATE POLICY "Super Admin access for subjects"
  ON public.subjects FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Institute staff can view and manage subjects"
  ON public.subjects FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() IN ('institute_admin', 'teacher')
  );

CREATE POLICY "Parents/Students can view subjects for their classes"
  ON public.subjects FOR SELECT
  USING (class_id IN (SELECT public.get_parent_class_ids()));

-- 6.6 TIMETABLE
CREATE POLICY "Super Admin access for timetable"
  ON public.timetable FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Institute staff can manage timetable"
  ON public.timetable FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() IN ('institute_admin', 'teacher')
  );

CREATE POLICY "Parents/Students can view their class timetable"
  ON public.timetable FOR SELECT
  USING (class_id IN (SELECT public.get_parent_class_ids()));

-- 6.7 NOTES
CREATE POLICY "Super Admin access for notes"
  ON public.notes FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Teachers and Admins can upload and manage notes"
  ON public.notes FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() IN ('institute_admin', 'teacher')
  );

CREATE POLICY "Parents/Students can view notes for their classes"
  ON public.notes FOR SELECT
  USING (class_id IN (SELECT public.get_parent_class_ids()));

-- 6.8 ANNOUNCEMENTS
CREATE POLICY "Super Admin access for announcements"
  ON public.announcements FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Institute staff can create and manage announcements"
  ON public.announcements FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() IN ('institute_admin', 'teacher')
  );

CREATE POLICY "Parents/Students can view targeted announcements"
  ON public.announcements FOR SELECT
  USING (
    (
      target_type = 'all'
      AND institute_id IN (
        SELECT institute_id FROM public.students 
        WHERE id IN (SELECT public.get_parent_student_ids())
      )
    ) OR (
      target_type IN ('class', 'batch')
      AND target_class_id IN (SELECT public.get_parent_class_ids())
    )
  );

-- 6.9 ATTENDANCE
CREATE POLICY "Super Admin access for attendance"
  ON public.attendance FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Teachers and Admins can view and mark attendance"
  ON public.attendance FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() IN ('institute_admin', 'teacher')
  );

CREATE POLICY "Parents can view attendance records of their children"
  ON public.attendance FOR SELECT
  USING (student_id IN (SELECT public.get_parent_student_ids()));

-- 6.10 FEE PLANS
CREATE POLICY "Super Admin access for fee plans"
  ON public.fee_plans FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Institute Admins can manage fee plans"
  ON public.fee_plans FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() = 'institute_admin'
  );

CREATE POLICY "Staff can view fee plans"
  ON public.fee_plans FOR SELECT
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() IN ('institute_admin', 'teacher')
  );

-- 6.11 STUDENT FEE DUES
CREATE POLICY "Super Admin access for student fee dues"
  ON public.student_fee_dues FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Institute Admins can manage student fee dues"
  ON public.student_fee_dues FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() = 'institute_admin'
  );

CREATE POLICY "Parents can view fee dues of their linked children"
  ON public.student_fee_dues FOR SELECT
  USING (student_id IN (SELECT public.get_parent_student_ids()));

-- 6.12 FEE PAYMENTS
CREATE POLICY "Super Admin access for fee payments"
  ON public.fee_payments FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Institute Admins can manage fee payments"
  ON public.fee_payments FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() = 'institute_admin'
  );

CREATE POLICY "Parents can view receipts for their children"
  ON public.fee_payments FOR SELECT
  USING (student_id IN (SELECT public.get_parent_student_ids()));

-- 6.13 EXAMS & EXAM SUBJECTS
CREATE POLICY "Super Admin access for exams"
  ON public.exams FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Staff can manage exams"
  ON public.exams FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() IN ('institute_admin', 'teacher')
  );

CREATE POLICY "Parents can view published exams"
  ON public.exams FOR SELECT
  USING (
    is_published = true 
    AND class_id IN (SELECT public.get_parent_class_ids())
  );

CREATE POLICY "Super Admin access for exam subjects"
  ON public.exam_subjects FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Staff can manage exam subjects"
  ON public.exam_subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exams e 
      WHERE e.id = exam_id 
      AND e.institute_id = public.current_user_institute_id()
      AND public.current_user_role() IN ('institute_admin', 'teacher')
    )
  );

CREATE POLICY "Parents can view exam subjects for published exams"
  ON public.exam_subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exams e 
      WHERE e.id = exam_id 
      AND e.is_published = true 
      AND e.class_id IN (SELECT public.get_parent_class_ids())
    )
  );

-- 6.14 MARKS
CREATE POLICY "Super Admin access for marks"
  ON public.marks FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Staff can enter and manage marks"
  ON public.marks FOR ALL
  USING (
    institute_id = public.current_user_institute_id()
    AND public.current_user_role() IN ('institute_admin', 'teacher')
  );

CREATE POLICY "Parents can view marks for published exams"
  ON public.marks FOR SELECT
  USING (
    student_id IN (SELECT public.get_parent_student_ids())
    AND EXISTS (
      SELECT 1 FROM public.exams e 
      WHERE e.id = exam_id 
      AND e.is_published = true
    )
  );

-- 6.15 DEVICE TOKENS & NOTIFICATIONS
CREATE POLICY "Users can manage their own device tokens"
  ON public.device_tokens FOR ALL
  USING (
    phone = public.current_user_phone()
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Users can view and acknowledge their own notifications"
  ON public.notifications FOR SELECT
  USING (
    recipient_phone = public.current_user_phone()
    OR (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid())
  );

CREATE POLICY "Users can update read status on their notifications"
  ON public.notifications FOR UPDATE
  USING (
    recipient_phone = public.current_user_phone()
    OR (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid())
  )
  WITH CHECK (
    recipient_phone = public.current_user_phone()
    OR (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid())
  );

CREATE POLICY "Users can manage their notification settings"
  ON public.notification_settings FOR ALL
  USING (
    phone = public.current_user_phone()
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- ==============================================================================
-- 7. AUTOMATIC TIMESTAMPS & RECEIPT GENERATOR TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_institutes_modtime BEFORE UPDATE ON public.institutes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_classes_modtime BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_students_modtime BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_seq INT;
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    SELECT COALESCE(settings->>'receipt_prefix', 'REC') INTO v_prefix
    FROM public.institutes WHERE id = NEW.institute_id;

    SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq
    FROM public.fee_payments WHERE institute_id = NEW.institute_id;

    NEW.receipt_number = v_prefix || '-' || to_char(now(), 'YYYYMM') || '-' || lpad(v_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_receipt_number
BEFORE INSERT ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.generate_receipt_number();

-- ==============================================================================
-- 8. INITIAL DEFAULT TENANT (SPRINGFIELD ACADEMY)
-- ==============================================================================
INSERT INTO public.institutes (
  id,
  name,
  slug,
  phone,
  email,
  address,
  city,
  state,
  pincode,
  subscription_plan,
  subscription_status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Springfield Academy',
  'springfield-academy',
  '+919876543210',
  'admin@springfield.edu.in',
  '123 Education Lane, MG Road',
  'Kochi',
  'Kerala',
  '682001',
  'enterprise',
  'active'
) ON CONFLICT (id) DO NOTHING;
