# Keep the Node version in sync with .node-version (Netlify) and "engines" in package.json.
FROM node:26.13

# fish from Debian's packages (4.x on trixie), so it doesn't have to be compiled.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fish \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/www/.local/share/fish

WORKDIR /app
