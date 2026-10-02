#!/usr/bin/env bash
# Crée (si absents) l'utilisateur et la base Churchy dans postgres-central.
# Lit DATABASE_URL dans docker/.env : le mot de passe n'est ni affiché ni passé en argument.
# Idempotent. Usage (sur le VPS) : bash ~/apps/churchy/docker/provision-db.sh
set -euo pipefail
cd "$(dirname "$0")"

URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)
USER_NAME=$(sed -E 's#^[a-z]+://([^:]+):.*#\1#' <<<"$URL")
PASSWORD=$(sed -E 's#^[a-z]+://[^:]+:([^@]+)@.*#\1#' <<<"$URL")
DB_NAME=$(sed -E 's#^.*/([^/?]+)(\?.*)?$#\1#' <<<"$URL")

docker exec -i postgres-central psql -U postgres -v ON_ERROR_STOP=1 \
  -v user_name="$USER_NAME" -v pw="$PASSWORD" -v db_name="$DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'user_name', :'pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'user_name') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'user_name')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'db_name') \gexec
SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'db_name', :'user_name') \gexec
SQL
echo "OK : base '$DB_NAME' et utilisateur '$USER_NAME' prêts."
