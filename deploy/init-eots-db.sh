#!/bin/bash
set -e

echo "Creating eots database and user..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER eots WITH PASSWORD '$EOTS_DB_PASSWORD';
    CREATE DATABASE eots OWNER eots;
    GRANT ALL PRIVILEGES ON DATABASE eots TO eots;
EOSQL

echo "eots database and user created successfully."