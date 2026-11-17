// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions runs on Deno, not React Native: it has its own globals
    // (Deno, npm: imports) that this config knows nothing about.
    ignores: ['dist/*', 'supabase/functions/*'],
  },
]);
