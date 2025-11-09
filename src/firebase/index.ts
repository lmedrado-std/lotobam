'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }

  // When deployed to App Hosting, the K_SERVICE environment variable is set.
  // See https://cloud.google.com/run/docs/container-contract#services-env-vars
  if (process.env.K_SERVICE) {
    // In the App Hosting environment, initializeApp() discovers the config automatically.
    return getSdks(initializeApp());
  } else {
    // In a local environment, we use the config file.
    return getSdks(initializeApp(firebaseConfig));
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
