import { auth, db, googleAuthProvider } from '#/lib/firebase';
import { investmentKeys } from '#/queries/investment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from 'firebase/auth';
import { signOut as firebaseSignOut, onIdTokenChanged, signInWithPopup } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export async function checkInvitationAllowlist(
  email: string,
  dbInstance: Firestore = db
): Promise<boolean> {
  const docRef = doc(dbInstance, 'investment_allowed_users', email);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

export function useAllowlistQuery(email?: string | null) {
  return useQuery({
    queryKey: investmentKeys.allowlist(email || undefined),
    queryFn: async () => {
      if (!email) return false;
      return checkInvitationAllowlist(email, db);
    },
    enabled: !!email,
  });
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const allowlistQuery = useAllowlistQuery(user?.email);
  const isAllowed = user?.email ? !!allowlistQuery.data : false;
  const isLoading = authLoading || (!!user?.email && allowlistQuery.isLoading);

  const signInMutation = useMutation({
    mutationFn: async () => {
      await signInWithPopup(auth, googleAuthProvider);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await firebaseSignOut(auth);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      queryClient.removeQueries({ queryKey: investmentKeys.all });
    },
  });

  return {
    user,
    isAllowed,
    isLoading,
    signIn: () => signInMutation.mutateAsync(),
    signOut: () => signOutMutation.mutateAsync(),
    signInMutation,
    signOutMutation,
  };
}
