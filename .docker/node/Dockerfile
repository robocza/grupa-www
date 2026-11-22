# Keep the Node version in sync with .node-version (Netlify) and "engines" in package.json.
FROM node:26.13

# fish and just from Debian's packages (fish 4.x, just 1.40 on trixie), so nothing has to be
# compiled. just runs the justfile's recipes inside the container too (e.g. `just build-dev`).
RUN apt-get update \
    && apt-get install -y --no-install-recommends fish just \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Deno for `astro dev`: the Netlify adapter's dev server runs Netlify Edge Functions in Deno, uses
# the `deno` on the PATH if there is one, and otherwise downloads the newest Deno 2.x. Deno 2.9.6+
# rejects the `--allow-scripts` flag it passes to `deno eval` ("unexpected argument
# '--allow-scripts' found"), so pin 2.9.5. Try a newer version when @netlify/edge-functions-dev
# or Deno fixes this.
COPY --from=denoland/deno:bin-2.9.5 /deno /usr/local/bin/deno

RUN mkdir -p /var/www/.local/share/fish

WORKDIR /app
