const admin = require('firebase-admin');

let db = null;
let bucket = null;
let initialized = false;

function initFirebase() {
  if (initialized) return { db, bucket };

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_STORAGE_BUCKET,
  } = process.env;

  // Only init if credentials are provided
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('⚠️  Firebase credentials not configured. Running in demo mode.');
    return { db: null, bucket: null };
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: FIREBASE_CLIENT_EMAIL,
          clientId: process.env.FIREBASE_CLIENT_ID,
        }),
        storageBucket: FIREBASE_STORAGE_BUCKET,
      });
    }

    db = admin.firestore();
    bucket = admin.storage().bucket();
    initialized = true;
    console.log('🔥 Firebase connected successfully');
  } catch (err) {
    console.error('Firebase init error:', err.message);
  }

  return { db, bucket };
}

function getDb() { return db; }
function getBucket() { return bucket; }
function isInitialized() { return initialized; }

module.exports = { initFirebase, getDb, getBucket, isInitialized };
