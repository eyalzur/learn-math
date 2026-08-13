/**
 * The app's version, as shown on the first screen.
 *
 * The number itself lives in package.json — the single source of truth — and Vite
 * substitutes it here at build time. This module deliberately **imports nothing**: a data
 * file that sits at the edge of the dependency graph cannot take part in an import cycle,
 * and one of those already took this app down to a white screen once (see CLAUDE.md).
 *
 * It exists so components import a normal typed value rather than reaching for a magic
 * global, and so there is exactly one place to change if the mechanism ever does.
 */
export const APP_VERSION: string = __APP_VERSION__;
