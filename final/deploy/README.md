# Knapsack hosting

The combined app runs as a production Node 22 container on `laptop`. Caddy on `cloud` serves `https://knapsack.pontrolcanel.top` and proxies over Tailscale to `100.64.0.3:3100`. Other services keep their existing ports and routes.

## Container

From `final/`, create a private `.env.production` using `.env.example`, then run:

```sh
docker compose -p knapsack -f deploy/compose.yaml up -d --build
```

The default port binding is `127.0.0.1:3100`. On the laptop, deployment uses:

```sh
KNAPSACK_ENV_FILE=/home/meep/knapsack/shared/.env.production \
KNAPSACK_BIND_ADDRESS=100.64.0.3 \
KNAPSACK_IMAGE_TAG=c674482-deploy \
docker compose -p knapsack -f deploy/compose.yaml up -d --build
```

Releases live under `/home/meep/knapsack/releases/`; `/home/meep/knapsack/current` points at the running release. Change the image tag and release directory together for subsequent deployments. The app restarts automatically through Docker's `unless-stopped` policy and has a health check at `/api/astra/status` that makes no model calls.

The runtime environment file has mode `0600` and stays outside the release. Never commit it or copy it into the image. `.dockerignore` excludes local environment files, browser recordings, dependencies, and build output. The Docker build creates Next's standalone server and includes its static files and public assets; it runs as the unprivileged `node` user.

## Caddy and DNS

Create a DNS-only A record for `knapsack.pontrolcanel.top` pointing to `107.152.36.149`. The site block is in [Caddyfile](Caddyfile).

The cloud server runs Caddy in the root-owned Podman container `caddy`. Its configuration is bind-mounted read-only from `/mnt/containers/caddy/Caddyfile`; edit the host file in place so the mounted inode stays valid. Preserve the other site blocks, back up the file, validate the candidate in the container, then reload Caddy. A configuration reload preserves the existing services.

## Checks

```sh
ssh laptop 'docker ps --filter label=com.docker.compose.project=knapsack'
ssh cloud 'curl -fsS http://100.64.0.3:3100/api/astra/status'
curl -fsS https://knapsack.pontrolcanel.top/api/astra/status
```

The status endpoint reports whether the API credential is configured and which model is selected; it never returns the credential. Trip inventory and photos remain in the visitor's browser storage.

The initial deployment on 2026-10-24 serves source revision `c674482` with the deployment files in this directory. The production container is healthy and uses `gpt-6-astra`. Public HTTPS checks passed for `/`, `/pack`, the status endpoint, and all 12 page JavaScript assets. Same-origin upload and advice validation return the expected 400 responses for incomplete input; a foreign origin returns 403. No paid model requests were needed for these deployment checks. The existing blog and upload sites retained their expected 200 and 301 responses.

The original Caddy configuration was backed up to `/mnt/containers/caddy/Caddyfile.before-knapsack-20261024T232248Z` before the validated reload. Let's Encrypt issued the new site's certificate successfully; Caddy manages renewal.
