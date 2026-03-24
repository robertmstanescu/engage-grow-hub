
-- Fix security definer view warning by setting security_invoker
ALTER VIEW public.site_content_public SET (security_invoker = true);
