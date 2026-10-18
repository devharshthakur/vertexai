// @ts-check
/**
 * nano-staged configuration.
 *
 * nano-staged discovers only `.nano-staged.js`, `.nano-staged.cjs`,
 * `.nano-staged.mjs`, `.nano-staged.json`, `.nanostagedrc` and the
 * `nano-staged` field in `package.json`, so a `.ts` config file cannot be
 * loaded. JSDoc types give the same editor checking with a supported name.
 *
 * The command strings below get the matched file paths appended automatically.
 *
 * @see https://github.com/usmanyunusov/nano-staged#configuration
 * @type {import('nano-staged').Configuration}
 */
const config = {
  '*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,vue}': ['eslint --fix', 'prettier --write'],
  '*.{json,css,scss,md,yml,yaml}': 'prettier --write'
}

export default config
