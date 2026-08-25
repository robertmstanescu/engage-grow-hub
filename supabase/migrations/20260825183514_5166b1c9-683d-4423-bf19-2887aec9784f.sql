CREATE OR REPLACE FUNCTION public.analytics_page_stats(
  p_since timestamptz,
  p_until timestamptz,
  p_traffic text DEFAULT 'human',
  p_country text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  path text,
  views bigint,
  unique_visitors bigint,
  avg_duration numeric,
  avg_scroll numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.path,
         count(*)::bigint AS views,
         count(DISTINCT coalesce(l.visitor_id, l.ip_hash))::bigint AS unique_visitors,
         round(avg(l.duration_seconds)::numeric, 1) AS avg_duration,
         round(avg(l.scroll_depth)::numeric, 1) AS avg_scroll
  FROM public.unified_analytics_logs l
  WHERE public.is_admin(auth.uid())
    AND l.created_at >= p_since AND l.created_at <= p_until
    AND (p_traffic = 'all' OR (p_traffic = 'human' AND l.is_bot = false) OR (p_traffic = 'bot' AND l.is_bot = true))
    AND (p_country IS NULL OR l.country = p_country)
    AND (p_category IS NULL OR l.category = p_category)
  GROUP BY l.path
  ORDER BY views DESC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_referrer_stats(
  p_since timestamptz,
  p_until timestamptz,
  p_traffic text DEFAULT 'human'
)
RETURNS TABLE (
  label text,
  kind text,
  visits bigint,
  unique_visitors bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN l.search_engine IS NOT NULL AND l.search_engine <> '' THEN l.search_engine
      WHEN coalesce(l.attribution->>'utm_source', '') <> '' THEN l.attribution->>'utm_source'
      WHEN l.referrer IS NULL OR l.referrer = '' THEN 'Direct / none'
      ELSE regexp_replace(regexp_replace(l.referrer, '^https?://', ''), '/.*$', '')
    END AS label,
    CASE
      WHEN l.search_engine IS NOT NULL AND l.search_engine <> '' THEN 'search'
      WHEN coalesce(l.attribution->>'utm_source', '') <> '' THEN 'campaign'
      WHEN l.referrer IS NULL OR l.referrer = '' THEN 'direct'
      ELSE 'referral'
    END AS kind,
    count(*)::bigint AS visits,
    count(DISTINCT coalesce(l.visitor_id, l.ip_hash))::bigint AS unique_visitors
  FROM public.unified_analytics_logs l
  WHERE public.is_admin(auth.uid())
    AND l.created_at >= p_since AND l.created_at <= p_until
    AND (p_traffic = 'all' OR (p_traffic = 'human' AND l.is_bot = false) OR (p_traffic = 'bot' AND l.is_bot = true))
  GROUP BY 1, 2
  ORDER BY visits DESC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_visitor_depth(
  p_since timestamptz,
  p_until timestamptz
)
RETURNS TABLE (
  total_visitors bigint,
  multi_page_visitors bigint,
  avg_pages_per_visitor numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH per_visitor AS (
    SELECT coalesce(l.visitor_id, l.ip_hash) AS vid,
           count(DISTINCT l.path) AS pages
    FROM public.unified_analytics_logs l
    WHERE public.is_admin(auth.uid())
      AND l.is_bot = false
      AND l.created_at >= p_since AND l.created_at <= p_until
      AND coalesce(l.visitor_id, l.ip_hash) IS NOT NULL
    GROUP BY 1
  )
  SELECT count(*)::bigint,
         count(*) FILTER (WHERE pages > 1)::bigint,
         round(coalesce(avg(pages), 0)::numeric, 2)
  FROM per_visitor;
$$;

CREATE OR REPLACE FUNCTION public.analytics_page_transitions(
  p_since timestamptz,
  p_until timestamptz,
  p_limit integer DEFAULT 12
)
RETURNS TABLE (
  from_path text,
  to_path text,
  transitions bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ordered AS (
    SELECT l.path,
           lead(l.path) OVER (PARTITION BY coalesce(l.visitor_id, l.ip_hash) ORDER BY l.created_at) AS next_path
    FROM public.unified_analytics_logs l
    WHERE public.is_admin(auth.uid())
      AND l.is_bot = false
      AND l.created_at >= p_since AND l.created_at <= p_until
      AND coalesce(l.visitor_id, l.ip_hash) IS NOT NULL
  )
  SELECT path, next_path, count(*)::bigint
  FROM ordered
  WHERE next_path IS NOT NULL AND next_path <> path
  GROUP BY 1, 2
  ORDER BY 3 DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.analytics_page_breakdown(
  p_path text,
  p_since timestamptz,
  p_until timestamptz,
  p_dimension text DEFAULT 'referrer'
)
RETURNS TABLE (
  label text,
  visits bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE p_dimension
      WHEN 'device' THEN coalesce(l.device, 'Unknown')
      WHEN 'browser' THEN coalesce(l.browser, 'Unknown')
      WHEN 'country' THEN coalesce(l.country, 'Unknown')
      ELSE CASE
        WHEN l.search_engine IS NOT NULL AND l.search_engine <> '' THEN l.search_engine
        WHEN l.referrer IS NULL OR l.referrer = '' THEN 'Direct / none'
        ELSE regexp_replace(regexp_replace(l.referrer, '^https?://', ''), '/.*$', '')
      END
    END AS label,
    count(*)::bigint
  FROM public.unified_analytics_logs l
  WHERE public.is_admin(auth.uid())
    AND l.is_bot = false
    AND l.path = p_path
    AND l.created_at >= p_since AND l.created_at <= p_until
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT 25;
$$;

CREATE OR REPLACE FUNCTION public.analytics_page_trend(
  p_path text,
  p_since timestamptz,
  p_until timestamptz
)
RETURNS TABLE (
  day date,
  views bigint,
  unique_visitors bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (l.created_at AT TIME ZONE 'UTC')::date AS day,
         count(*)::bigint,
         count(DISTINCT coalesce(l.visitor_id, l.ip_hash))::bigint
  FROM public.unified_analytics_logs l
  WHERE public.is_admin(auth.uid())
    AND l.is_bot = false
    AND l.path = p_path
    AND l.created_at >= p_since AND l.created_at <= p_until
  GROUP BY 1
  ORDER BY 1;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_page_stats(timestamptz, timestamptz, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_referrer_stats(timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_visitor_depth(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_page_transitions(timestamptz, timestamptz, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_page_breakdown(text, timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_page_trend(text, timestamptz, timestamptz) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.analytics_page_stats(timestamptz, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_referrer_stats(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_visitor_depth(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_page_transitions(timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_page_breakdown(text, timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_page_trend(text, timestamptz, timestamptz) TO authenticated;