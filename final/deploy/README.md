# Knapsack hosting

The beta landing page runs as a production Node 22 container on `laptop`. Caddy on `cloud` serves `https://knapsack.pontrolcanel.top` and proxies to `100.64.0.3:3100`.

## Beta release

From a release directory, run:

```sh
KNAPSACK_BIND_ADDRESS=100.64.0.3 \
KNAPSACK_IMAGE_TAG=<release-tag> \
docker compose -p knapsack -f deploy/compose.yaml up -d --build
```

Releases live under `/home/meep/knapsack/releases/`; `/home/meep/knapsack/current` points at the running release. The beta runs with `WAITLIST_ONLY=true`, which sends `/pack` visitors to the waitlist and hides the packing APIs. The container health check uses `/api/health`.

Signups are stored in `waitlist.sqlite` in the Docker volume `knapsack_knapsack_waitlist`. The volume persists across releases. To print the addresses on laptop:

```sh
docker exec knapsack-knapsack-1 node -e 'const { DatabaseSync } = require("node:sqlite"); const db = new DatabaseSync("/var/lib/knapsack/waitlist.sqlite", { readOnly: true }); for (const row of db.prepare("SELECT email FROM signups ORDER BY created_at").all()) console.log(row.email); db.close()'
```

The beta container does not need the shared provider credentials. Keep those credentials outside the release for any future app deployment. Back up the waitlist volume before removing or recreating it.

## Checks

```sh
ssh laptop 'docker ps --filter label=com.docker.compose.project=knapsack'
ssh cloud 'curl -fsS http://100.64.0.3:3100/api/health'
curl -fsS https://knapsack.pontrolcanel.top/api/health
```
