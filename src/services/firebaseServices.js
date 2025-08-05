const admin = require("firebase-admin");
const serviceAccount = require('../config/serviceAccountKey-re-mechanic-dev2.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});

const db = admin.firestore();
const timestamp = admin.firestore.Timestamp.now()
module.exports = {db,timestamp};