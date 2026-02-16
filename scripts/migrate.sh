#!/bin/bash

# Script to run database migrations
# Usage: ./scripts/migrate.sh [up|down|create]

set -e

# Load environment variables from .env if it exists (for local development)
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Use DATABASE_URL if already set (Railway/production), otherwise construct it
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgres://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
fi

case "$1" in
  up)
    echo "Running migrations..."
    npx node-pg-migrate up
    ;;
  down)
    echo "Rolling back migrations..."
    npx node-pg-migrate down
    ;;
  create)
    if [ -z "$2" ]; then
      echo "Error: Migration name required"
      echo "Usage: ./scripts/migrate.sh create <migration-name>"
      exit 1
    fi
    echo "Creating migration: $2"
    npx node-pg-migrate create "$2"
    ;;
  *)
    echo "Usage: ./scripts/migrate.sh [up|down|create <name>]"
    exit 1
    ;;
esac
