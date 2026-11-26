-- Passwords come from the generated .env and must match POSTGRES_PASSWORD.
\set pgpass `echo "$POSTGRES_PASSWORD"`

select format('alter user %I with password %L', rolname, :'pgpass')
from pg_roles
where rolname in (
	'authenticator',
	'pgbouncer',
	'supabase_auth_admin',
	'supabase_functions_admin',
	'supabase_storage_admin'
)
\gexec
