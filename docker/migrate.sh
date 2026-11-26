#!/bin/sh
set -eu

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:?PGPORT is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"

psql -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists public.opencadre_migrations (
  filename text primary key,
  applied_at timestamp with time zone not null default now()
);
SQL

for file in /migrations/*.sql; do
	[ -f "$file" ] || continue
	name=$(basename "$file")

	applied=$(psql -tAc "select 1 from public.opencadre_migrations where filename = '$name'")
	if [ "$applied" = "1" ]; then
		echo "Already applied: $name"
		continue
	fi

	echo "Applying: $name"
	psql -v ON_ERROR_STOP=1 -1 -f "$file"
	psql -v ON_ERROR_STOP=1 -c "insert into public.opencadre_migrations (filename) values ('$name')"
done

echo "All migrations are up to date."
