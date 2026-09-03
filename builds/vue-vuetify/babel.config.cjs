/**
 * Only used by Jest, to transform Vuetify's ESM-only `node_modules` build
 * (`vue.runtime.esm-bundler.js`'s sibling packages ship no CommonJS build at
 * all) down to CommonJS so it can load under Jest's classic module system.
 * `vite build` never touches this file.
 */
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
