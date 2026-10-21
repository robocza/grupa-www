// Shared by astro.config.mjs and components. Keep it free of other imports: components that
// render on demand (Netlify Function) can't load astro.config.mjs and its build tooling.
export const defaultLocale = "pl";
export const locales = ["en", "pl"];
