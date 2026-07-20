#!/usr/bin/env bash
# One-time bootstrap: obtain the first Let's Encrypt certificate.
#
# nginx won't start without a cert file, and certbot can't get a cert without
# nginx serving the ACME challenge — so we start nginx on a throwaway
# self-signed cert, obtain the real one, then reload. Run once after the first
# `git clone`; renewals thereafter are automatic (certbot sidecar).
#
# Prereqs: .env has SERVER_NAME + CERTBOT_EMAIL, and nginx/.htpasswd exists.
# Set STAGING=1 to test against Let's Encrypt's staging CA (avoids rate limits).
set -e

set -a; . ./.env; set +a

if [ -z "$SERVER_NAME" ] || [ -z "$CERTBOT_EMAIL" ]; then
  echo "Set SERVER_NAME and CERTBOT_EMAIL in .env first."; exit 1
fi
if [ ! -f nginx/.htpasswd ]; then
  echo "Missing nginx/.htpasswd — create it first (see README)."; exit 1
fi

staging_arg=""
[ "${STAGING:-0}" != "0" ] && staging_arg="--staging"

echo "### Building images ..."
docker compose build

echo "### Creating dummy certificate for $SERVER_NAME ..."
docker compose run --rm --entrypoint "sh -c '\
  mkdir -p /etc/letsencrypt/live/$SERVER_NAME && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$SERVER_NAME/privkey.pem \
    -out    /etc/letsencrypt/live/$SERVER_NAME/fullchain.pem \
    -subj   /CN=localhost'" certbot

echo "### Starting nginx (serves the ACME challenge) ..."
docker compose up -d frontend

echo "### Deleting dummy certificate ..."
docker compose run --rm --entrypoint "rm -rf \
  /etc/letsencrypt/live/$SERVER_NAME \
  /etc/letsencrypt/archive/$SERVER_NAME \
  /etc/letsencrypt/renewal/$SERVER_NAME.conf" certbot

echo "### Requesting Let's Encrypt certificate for $SERVER_NAME ..."
docker compose run --rm --entrypoint "certbot certonly --webroot \
  -w /var/www/certbot $staging_arg \
  --email $CERTBOT_EMAIL -d $SERVER_NAME \
  --rsa-key-size 2048 --agree-tos --no-eff-email --force-renewal" certbot

echo "### Reloading nginx with the real certificate ..."
docker compose exec frontend nginx -s reload

echo "### Bringing up all services ..."
docker compose up -d

echo "### Done → https://$SERVER_NAME"
