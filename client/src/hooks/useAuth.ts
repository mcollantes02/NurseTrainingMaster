
import { useState, useEffect } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  loginWithEmail, 
  registerWithEmail, 
  loginWithGoogle, 
  logout as firebaseLogout, 
  onAuthChange 
} from "@/lib/firebase";
import type { User } from "@shared/schema";

interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [isRegisterPending, setIsRegisterPending] = useState(false);
  const [isLogoutPending, setIsLogoutPending] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        try {
          // Get the ID token
          const idToken = await firebaseUser.getIdToken(true);
          
          // Send the token to your backend to verify and get/create user
          const response = await apiRequest("POST", "/api/auth/firebase", {
            idToken,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            uid: firebaseUser.uid
          });
          
          const userData = await response.json();
          setUser(userData.user);
          
          // Invalidate all queries when user changes to refresh data
          queryClient.invalidateQueries();
        } catch (error) {
          console.error('Error verifying Firebase token:', error);
          setUser(null);
          queryClient.clear();
        }
      } else {
        setUser(null);
        queryClient.clear();
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [queryClient]);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoginPending(true);
    try {
      await loginWithEmail(credentials.email, credentials.password);
      // User state will be updated by onAuthChange
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoginPending(false);
    }
  };

  const loginWithGoogleProvider = async () => {
    setIsLoginPending(true);
    try {
      await loginWithGoogle();
      // User state will be updated by onAuthChange
    } catch (error: any) {
      throw new Error(error.message || 'Google login failed');
    } finally {
      setIsLoginPending(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) => {
    setIsRegisterPending(true);
    try {
      const userCredential = await registerWithEmail(userData.email, userData.password);
      
      // Update the user profile with additional information
      await userCredential.user.updateProfile({
        displayName: `${userData.firstName} ${userData.lastName}`
      });

      // User state will be updated by onAuthChange with the additional data
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    } finally {
      setIsRegisterPending(false);
    }
  };

  const logout = async () => {
    setIsLogoutPending(true);
    try {
      await firebaseLogout();
      await apiRequest("POST", "/api/auth/logout");
      queryClient.clear();
      setUser(null);
    } catch (error: any) {
      console.error('Logout error:', error);
    } finally {
      setIsLogoutPending(false);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle: loginWithGoogleProvider,
    register,
    logout,
    isLoginPending,
    isRegisterPending,
    isLogoutPending,
  };
}
