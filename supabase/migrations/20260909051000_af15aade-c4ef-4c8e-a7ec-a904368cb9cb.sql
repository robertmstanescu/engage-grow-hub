CREATE TABLE IF NOT EXISTS public.unified_analytics_logs_archive_20260909 AS SELECT * FROM public.unified_analytics_logs;
ALTER TABLE public.unified_analytics_logs_archive_20260909 ENABLE ROW LEVEL SECURITY;
SELECT count(*) AS archived FROM public.unified_analytics_logs_archive_20260909;
TRUNCATE TABLE public.unified_analytics_logs;
SELECT count(*) AS remaining FROM public.unified_analytics_logs;