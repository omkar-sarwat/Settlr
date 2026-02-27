// Profile hook — fetch and update user profile with React Query + Zustand sync
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile, type ProfileUpdateData } from '../api/profile.api';
import { useAuthStore } from '../store/authStore';

/** Fetch the current user's profile */
export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await getProfile();
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Update profile and sync with auth store + query cache */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const account = useAuthStore((s) => s.account);

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      const response = await updateProfile(data);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Update Zustand store so sidebar/header reflect new name immediately
      if (accessToken && account && updatedUser) {
        setAuth(updatedUser, account, accessToken);
      }
      // Invalidate profile query cache
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
