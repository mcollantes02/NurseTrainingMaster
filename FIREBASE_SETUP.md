
# Firebase Authentication Setup

This application now uses Firebase Authentication for secure user authentication. Follow these steps to set up Firebase:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication
4. Enable Email/Password and Google sign-in methods

## 2. Get Firebase Configuration

### For Client (Environment Variables in Secrets)

Add these environment variables to your Replit Secrets:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### For Server (Already configured)

The server uses the same `FIREBASE_SERVICE_ACCOUNT` and `FIREBASE_PROJECT_ID` you're already using for Firestore.

## 3. Configure Google Sign-In (Optional)

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Google sign-in
3. Add your domain to authorized domains

## 4. Security Features

- All passwords are handled by Firebase (never stored in your database)
- Secure token-based authentication
- Automatic token refresh
- Protection against common attacks
- Google OAuth integration

## 5. Migration

The system automatically migrates existing users when they first log in with Firebase by linking their Firebase UID to their existing account.
