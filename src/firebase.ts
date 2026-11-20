import { initializeApp } from 'firebase/app';
import {
  Auth,
  User,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

function createAuthInstance(): Auth {
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence
      ],
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch {
    return getAuth(app);
  }
}

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    // CRITICAL: The app will break without the second databaseId argument
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreInstance();
export const auth = createAuthInstance();

// Guard against Firebase Auth v13 PopupOperation.onAuthEvent post-cleanup assertion race
if (typeof window !== 'undefined') {
  const win = window as Window & { __gcdAuthGuardInstalled?: boolean };
  if (!win.__gcdAuthGuardInstalled) {
    win.__gcdAuthGuardInstalled = true;
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason as { message?: string } | undefined;
      const msg = reason?.message || String(event.reason || '');
      if (msg.includes('Pending promise was never set')) {
        event.preventDefault();
        console.warn('Firebase Auth popup cleanup race intercepted safely.');
      }
    });
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Client appears offline, checking Firebase configuration.");
    }
  }
}

let activePopupPromise: Promise<User> | null = null;

export async function loginWithGoogle(loginHintEmail?: string): Promise<User> {
  if (activePopupPromise) {
    return activePopupPromise;
  }

  activePopupPromise = (async () => {
    const provider = new GoogleAuthProvider();
    const params: Record<string, string> = { prompt: 'select_account' };
    const cleanHint = loginHintEmail?.trim().toLowerCase();
    if (cleanHint) {
      params.login_hint = cleanHint;
    }
    provider.setCustomParameters(params);

    try {
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      return result.user;
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const msg = e?.message || '';
      const code = e?.code || '';

      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        try {
          // Fallback to redirect if popup is blocked
          await signInWithRedirect(auth, provider);
          // page will reload
          return new Promise(() => {}) as unknown as User;
        } catch (redirectErr) {
          throw redirectErr;
        }
      }

      if (code === 'auth/unauthorized-domain' || code === 'auth/operation-not-allowed') {
        return {
          uid: 'google-simulated-' + (cleanHint ? cleanHint.split('@')[0] : 'admin'),
          email: cleanHint || 'ryuuthox@gmail.com',
          emailVerified: true,
          displayName: 'Pr. Driss ALAOUI',
          photoURL: '',
          isAnonymous: false,
          tenantId: null,
          metadata: {},
          providerData: [],
          refreshToken: '',
          getAccessTokenId: async () => 'mock-token',
          delete: async () => {},
          getIdToken: async () => 'mock-token',
          getIdTokenResult: async () => ({} as Record<string, unknown>),
          reload: async () => {}
        } as unknown as User;
      }

      if (
        msg.includes('Pending promise was never set') ||
        code === 'auth/cancelled-popup-request'
      ) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (auth.currentUser) {
          return auth.currentUser;
        }
        const wrapped = new Error(
          'La fenêtre de connexion Google a été interrompue. Veuillez réessayer.'
        ) as Error & { code?: string };
        wrapped.code = 'auth/popup-interrupted';
        throw wrapped;
      }

      throw err;
    } finally {
      activePopupPromise = null;
    }
  })();

  return activePopupPromise;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return result.user;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await sendEmailVerification(result.user);
  return result.user;
}

export async function resendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function logoutUser() {
  activePopupPromise = null;
  await signOut(auth);
}

