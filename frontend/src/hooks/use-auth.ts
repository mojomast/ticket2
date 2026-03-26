import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '../api/client';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: api.auth.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: api.auth.login,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data);
    },
  });

  const demoLoginMutation = useMutation({
    mutationFn: (email: string) => api.auth.demoLogin(email),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/';
    },
  });

  return {
    user: (user as User) ?? null,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    demoLogin: demoLoginMutation.mutateAsync,
    logout: logoutMutation.mutate,
  };
}
