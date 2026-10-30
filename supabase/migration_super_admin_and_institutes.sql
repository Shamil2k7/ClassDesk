-- ==============================================================================
-- CLASSDESK MIGRATION: Multiple Super Admins, Institute Status & Audit Logs
-- ==============================================================================

-- 1. Ensure 'institutes' table supports status and institute_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'institutes' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.institutes ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'institutes' AND column_name = 'institute_type'
  ) THEN
    ALTER TABLE public.institutes ADD COLUMN institute_type TEXT DEFAULT 'school';
  END IF;
END $$;

-- Update status check constraint to support: active, pending, suspended, inactive
ALTER TABLE public.institutes DROP CONSTRAINT IF EXISTS institutes_status_check;
ALTER TABLE public.institutes ADD CONSTRAINT institutes_status_check 
  CHECK (status IN ('active', 'pending', 'suspended', 'inactive'));

-- 2. Create Audit Logs Table for Security & Administrative Events
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookup by institute or date
CREATE INDEX IF NOT EXISTS idx_audit_logs_institute ON public.audit_logs(institute_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super Admins can view all audit logs
CREATE POLICY "Super Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );

-- Institute Admins can view their own institute audit logs
CREATE POLICY "Institute Admins can view own institute audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    institute_id IS NOT NULL AND
    institute_id = (
      SELECT institute_id FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'institute_admin'
    )
  );

-- 3. Storage bucket for institute-logos (if storage schema exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('institute-logos', 'institute-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public can view institute logos
CREATE POLICY "Institute logos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'institute-logos');

-- Authorized staff or super admins can upload logos
CREATE POLICY "Admins can upload institute logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'institute-logos');

CREATE POLICY "Admins can update institute logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'institute-logos');

CREATE POLICY "Admins can delete institute logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'institute-logos');
