# syntax=docker/dockerfile:1

# The image holds the built application and the production dependencies it
# needs. The demo lecture videos are not part of it: they are mounted at
# runtime, so the image stays small and the videos stay replaceable.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# The package manager version is pinned, so the image installs the same
# dependency tree as the checkout.
RUN npm install --global pnpm@12.21.0
WORKDIR /app

# Dependencies are installed before the source is copied, so a source change
# does not reinstall them. The project's own lifecycle scripts are skipped
# here: they need the source and a Git checkout, which the image has neither of.
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM dependencies AS build
COPY . .
# The packages that ship a build step need it, because the install skipped it.
RUN pnpm rebuild esbuild unrs-resolver vue-demi
# The demo transcripts and course descriptions travel with the image, so the
# stack has demo data even when no lecture videos are mounted. The videos are
# far too large to ship in an image.
RUN mkdir -p /app/demo-assets && for folder in public/videos/*/; do slug=$(basename "$folder"); mkdir -p "/app/demo-assets/$slug"; cp "$folder/about.md" "$folder/transcript.txt" "/app/demo-assets/$slug/" 2>/dev/null || true; done
# A placeholder secret keeps the build independent of the deployment secrets.
# The runtime reads BETTER_AUTH_SECRET from the environment.
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret-not-used-at-runtime
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV MIGRATIONS_FOLDER=/app/server/db/migrations
ENV DEMO_ASSETS_DIR=/app/.output/public/videos
ENV DEMO_ASSETS_SOURCE=/app/demo-assets
COPY --from=build /app/.output ./.output
COPY --from=build /app/demo-assets ./demo-assets
COPY --from=build /app/server/db/migrations ./server/db/migrations
# Uploaded course materials live outside the checkout, on their own volume.
RUN mkdir -p /data/course-materials && addgroup -S vertexai && adduser -S vertexai -G vertexai && chown -R vertexai:vertexai /app /data
USER vertexai
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
