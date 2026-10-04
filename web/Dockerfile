# Runtime-only image for the TanStack Start server (nitro node-server preset).
#
# The app is built in CI by bun, then copied in — so this image contains no
# toolchain and no source, just .output. Build context is `web/`.
# See .github/workflows/deploy.yml.
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0

# .output/server + .output/public. The server resolves public assets as
# ../public relative to the server dir, so this layout must be preserved.
COPY .output ./.output

# Cloud Run injects PORT (default 8080); nitro reads process.env.PORT directly.
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
