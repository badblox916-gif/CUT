import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { firebaseAuth } from "@/lib/firebase-auth";

type Session = { user: { id: string; email: string | null } };
type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function authError(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : "";
  const messages: Record<string, string> = {
    "auth/invalid-email": "Escribe un correo electrónico válido.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/email-already-in-use":
      "Ya existe una cuenta con este correo. Inicia sesión.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/password-does-not-meet-requirements":
      "La contraseña no cumple los requisitos de seguridad. Elige otra.",
    "auth/too-many-requests":
      "Hubo demasiados intentos. Espera un momento antes de volver a intentar.",
    "auth/network-request-failed":
      "No pudimos conectar. Comprueba tu conexión e inténtalo de nuevo.",
    "auth/user-disabled": "Esta cuenta no está disponible.",
    "auth/operation-not-allowed":
      "El acceso con correo y contraseña aún no está disponible.",
  };
  return new Error(
    messages[code] ?? "No pudimos completar la solicitud. Inténtalo de nuevo.",
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(firebaseAuth));

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(
      firebaseAuth,
      (user) => {
        setSession(user ? { user: { id: user.uid, email: user.email } } : null);
        setIsLoading(false);
      },
      () => {
        setSession(null);
        setIsLoading(false);
      },
    );
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!firebaseAuth)
      throw new Error("El acceso a CUT estará disponible pronto.");
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error) {
      throw authError(error);
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!firebaseAuth) throw new Error("El registro estará disponible pronto.");
    try {
      // Firebase signs in the user only after successfully creating the account.
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error) {
      throw authError(error);
    }
  };

  const signOut = async () => {
    if (!firebaseAuth) return;
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (error) {
      throw authError(error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isConfigured: Boolean(firebaseAuth),
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
