const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

// Create a simple base64 encoded SHA256 hash for "Admin123!"
const hash = crypto.createHash('sha256').update('Admin123!').digest('base64');

const raw = fs.readFileSync('users.json', 'utf8');
const data = JSON.parse(raw);

const admin = data.users.find(u => u.email === 'admin@netconnect.app');
if (admin) {
  admin.passwordHash = hash;
  delete admin.salt;
  fs.writeFileSync('users_mod_sha.json', JSON.stringify({ users: [admin] }));
  console.log('Created modified users file');
} else {
  console.log('Admin not found in users.json');
}
