
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required');
}

if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID environment variable is required');
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT must be valid JSON');
}

// Ensure project_id is set in the service account
if (!serviceAccount.project_id && process.env.FIREBASE_PROJECT_ID) {
  serviceAccount.project_id = process.env.FIREBASE_PROJECT_ID;
}

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

export const firestore = getFirestore(app);
export const auth = getAuth(app);
export default firestore;
