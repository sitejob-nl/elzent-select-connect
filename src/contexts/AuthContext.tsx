import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  /**
   * Tri-state: `null` while unknown (initial load), `true` when the user has a
   * `client_preferences` row (onboarded), `false` when they need to complete
   * onboarding. Admins are always `true` — they skip onboarding.
   */
  hasPreferences: boolean | null;
  refreshPreferences: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasPreferences, setHasPreferences] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfileAndPrefs(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          fetchProfileAndPrefs(session.user.id);
        } else {
          setProfile(null);
          setHasPreferences(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfileAndPrefs(userId: string) {
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileErr || !profileData) {
      // Profile missing (trigger may have failed) — sign out to prevent limbo state
      await supabase.auth.signOut();
      setProfile(null);
      setHasPreferences(null);
      setIsLoading(false);
      return;
    }

    setProfile(profileData);

    // Admins skip onboarding altogether.
    if (profileData.role === "admin") {
      setHasPreferences(true);
      setIsLoading(false);
      return;
    }

    await loadPrefsExistence(userId);
    setIsLoading(false);
  }

  async function loadPrefsExistence(userId: string) {
    const { data, error } = await supabase
      .from("client_preferences")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    // Missing row is expected for new users — not an error. Real errors we
    // default to `true` so we don't trap users behind onboarding due to a
    // flaky query.
    if (error) {
      console.error("[auth] loadPrefsExistence failed", error);
      setHasPreferences(true);
      return;
    }
    setHasPreferences(!!data);
  }

  async function refreshPreferences() {
    if (session?.user) await loadPrefsExistence(session.user.id);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setHasPreferences(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isAdmin: profile?.role === "admin",
        isLoading,
        hasPreferences,
        refreshPreferences,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
