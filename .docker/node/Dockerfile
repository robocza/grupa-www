# Keep the Node version in sync with .node-version (Netlify) and "engines" in package.json.
FROM node:26.13

# fish and just from Debian's packages (fish 4.x, just 1.40 on trixie), so nothing has to be
# compiled. just runs the justfile's recipes inside the container too (e.g. `just build-dev`).
RUN apt-get update \
    && apt-get install -y --no-install-recommends fish just \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/www/.local/share/fish

WORKDIR /app
