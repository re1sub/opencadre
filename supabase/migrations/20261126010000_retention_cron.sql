-- Replace the dormant cleanup-retention edge function with a database job.
-- pg_cron is preloaded by the Supabase Postgres image.

create extension if not exists pg_cron;

create or replace function public.cleanup_expired_data()
returns void
language plpgsql
security definer
set search_path to '' as $fn$
begin
  delete from public.activity_logs
   where created_at < now() - interval '90 days';

  delete from public.security_events
   where created_at < now() - interval '365 days';

  delete from public.ai_requests
   where created_at < now() - interval '30 days';

  delete from public.notifications
   where created_at < now() - interval '90 days';
end;
$fn$;

revoke all on function public.cleanup_expired_data() from public;
grant execute on function public.cleanup_expired_data() to service_role;

select cron.unschedule(jobid)
  from cron.job
 where jobname = 'opencadre-cleanup-retention';

select cron.schedule(
  'opencadre-cleanup-retention',
  '0 3 * * *',
  $job$select public.cleanup_expired_data();$job$
);
