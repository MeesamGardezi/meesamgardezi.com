const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK using serviceAccount.json
const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccount.json');

if (!fs.existsSync(credPath)) {
  throw new Error(`serviceAccount.json not found at ${credPath}. Place your Firebase service account key there.`);
}

const serviceAccount = require(credPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
