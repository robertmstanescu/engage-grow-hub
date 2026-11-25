CREATE OR REPLACE FUNCTION public.lookup_public_redirect(_from_path text)
RETURNS TABLE(to_path text, status_code integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT r.to_path, r.status_code
  FROM public.redirects AS r
  WHERE r.from_path = _from_path
    AND char_length(_from_path) BETWEEN 1 AND 2048
    AND left(_from_path, 1) = '/'
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.lookup_public_redirect(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_public_redirect(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can read redirects" ON public.redirects;
REVOKE SELECT ON public.redirects FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.redirects TO authenticated;
GRANT ALL ON public.redirects TO service_role;

COMMENT ON FUNCTION public.lookup_public_redirect(text) IS 'Public exact-path lookup only: returns one destination and status, never the redirect list or administration metadata.';