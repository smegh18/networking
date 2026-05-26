const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

/**
 * Writes the Google Play Android Developer Verification token file into:
 * android/app/src/main/assets/adi-registration.properties
 *
 * The token is read from the environment variable:
 *   ADI_REGISTRATION_TOKEN
 *
 * This is intended for EAS (managed/prebuild) builds where `android/` may be generated at build time.
 */
module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const token = process.env.ADI_REGISTRATION_TOKEN;

      if (!token) {
        // Avoid breaking normal builds; verification builds must set the env var.
        // eslint-disable-next-line no-console
        console.warn('[withAdiRegistration] ADI_REGISTRATION_TOKEN not set; skipping token file generation.');
        return config;
      }

      const assetsDir = path.join(
        config.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'assets',
      );
      fs.mkdirSync(assetsDir, { recursive: true });

      const tokenFile = path.join(assetsDir, 'adi-registration.properties');
      fs.writeFileSync(tokenFile, token, { encoding: 'utf8' });

      return config;
    },
  ]);
};

