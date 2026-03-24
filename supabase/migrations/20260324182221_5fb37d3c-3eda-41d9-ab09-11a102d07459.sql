
-- Create admin_users table
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only service_role can manage admin_users
CREATE POLICY "Service role can manage admin_users" ON public.admin_users
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admins can read their own row
CREATE POLICY "Users can check own admin status" ON public.admin_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  )
$$;

-- Insert current admin user (robertmarianstanescu@gmail.com)
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'robertmarianstanescu@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Now update all RLS policies to use is_admin() instead of bare authenticated

-- blog_posts policies
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can read all posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON public.blog_posts;

CREATE POLICY "Admins can delete posts" ON public.blog_posts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert posts" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can read all posts" ON public.blog_posts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update posts" ON public.blog_posts FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- contacts policies
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;

CREATE POLICY "Admins can view contacts" ON public.contacts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- email_campaigns policies
DROP POLICY IF EXISTS "Authenticated users can manage campaigns" ON public.email_campaigns;

CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- site_content policies
DROP POLICY IF EXISTS "Authenticated users can insert site content" ON public.site_content;
DROP POLICY IF EXISTS "Authenticated users can update site content" ON public.site_content;

CREATE POLICY "Admins can insert site content" ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update site content" ON public.site_content FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Fix mutable search_path on existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;
