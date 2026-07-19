const admin = require('firebase-admin');
const app = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://bbcn-networking-default-rtdb.firebaseio.com"
});
admin.auth().updateUser('shCsO2fzZ6VlncUEO3ydvjTL4r82', {
  password: 'AdminPassword123!'
}).then(() => console.log('success')).catch(e => console.log(e));
