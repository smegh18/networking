#!/usr/bin/env node
/**
 * Prints SHA-1 and SHA-256 for an Android keystore (e.g. EAS preview).
 * Usage: node scripts/print-android-sha.js <keystore-path> [key-alias]
 * You will be prompted for the keystore password by keytool.
 *
 * Example (after downloading credentials from EAS):
 *   node scripts/print-android-sha.js ./path/to/keystore.jks
 *   node scripts/print-android-sha.js ./path/to/keystore.jks upload
 */

const { execSync } = require('child_process');
const path = require('path');

const keystorePath = process.argv[2];
const keyAlias = process.argv[3] || '';

if (!keystorePath) {
  console.error('Usage: node scripts/print-android-sha.js <keystore-path> [key-alias]');
  process.exit(1);
}

const resolved = path.resolve(process.cwd(), keystorePath);
const args = ['-list', '-v', '-keystore', resolved];
if (keyAlias) args.push('-alias', keyAlias);

try {
  const out = execSync('keytool', {
    args,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  const sha1 = (out.match(/SHA1:\s*([A-F0-9:]+)/i) || [])[1];
  const sha256 = (out.match(/SHA256:\s*([A-F0-9:]+)/i) || [])[1];
  if (sha1 && sha256) {
    console.log('\nAdd these in Firebase → Project settings → Your apps → Android app → SHA certificate fingerprints:\n');
    console.log('SHA-1:  ', sha1);
    console.log('SHA-256:', sha256);
    console.log('');
  } else {
    console.log(out);
  }
} catch (e) {
  if (e.stdout) console.log(e.stdout);
  if (e.stderr) console.error(e.stderr);
  process.exit(1);
}
