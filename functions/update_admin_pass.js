const admin = require('firebase-admin');

// Initialize with the standard app setup
admin.initializeApp({
  databaseURL: "https://bbcn-networking-default-rtdb.firebaseio.com"
});

const uid = 'shCsO2fzZ6VlncUEO3ydvjTL4r82';

admin.auth().updateUser(uid, {
  password: 'AdminPassword123!'
})
  .then((userRecord) => {
    console.log('Successfully updated user', userRecord.toJSON());
    process.exit(0);
  })
  .catch((error) => {
    console.log('Error updating user:', error);
    process.exit(1);
  });
