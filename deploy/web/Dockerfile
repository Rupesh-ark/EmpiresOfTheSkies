# Frontend image: Caddy serving the prebuilt, brotli-precompressed Vite output.
# The deploy-web workflow builds empires_of_the_skies/dist first, then uses a staging dir (Caddyfile + site/) as the context.
FROM caddy:2.11-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY site/ /srv/
