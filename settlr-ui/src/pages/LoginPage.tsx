// LoginPage — Full dark screen with centered card, Zod-validated form, password toggle
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Hexagon, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { loginUser } from '../api/auth.api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import type { LoginFormData } from '../types';

// Zod schema — validates email format and password length
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

/** Login page — centered card with purple glow, React Hook Form + Zod validation */
export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
  }

  // Form state managed by React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  /** Called when the form passes Zod validation — calls the login API */
  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await loginUser(data);
      setAuth(response.data.accessToken, response.data.user);
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      // Show user-friendly error from the API response
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        setApiError(axiosError.response?.data?.message || 'Login failed. Please try again.');
      } else {
        setApiError('Unable to connect. Please check your network.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  /** Toggle button for password visibility */
  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      className="text-text-muted hover:text-text-secondary transition-colors"
      tabIndex={-1}
    >
      {showPassword ? (
        <EyeOff className="w-4 h-4" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Gold glow background effect */}
      <div className="absolute w-96 h-96 bg-brand/5 blur-3xl rounded-full -z-10" />

      {/* Login card */}
      <div className="bg-bg-secondary rounded-lg shadow-lg p-8 max-w-md w-full border border-bg-tertiary relative">
        {/* Logo section */}
        <div className="flex items-center gap-2 mb-1">
          <Hexagon className="w-8 h-8 text-brand" />
          <span className="text-xl font-bold text-text-primary">SETTLR</span>
        </div>
        <p className="text-sm text-text-secondary mb-8">
          Secure Payments Platform
        </p>

        {/* API error message */}
        {apiError && (
          <div className="bg-danger-bg border border-danger rounded-lg p-3 mb-4">
            <p className="text-xs text-danger font-medium">{apiError}</p>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            rightElement={passwordToggle}
            {...register('password')}
          />

          <Button
            label={isLoading ? 'Signing in...' : 'Sign In'}
            type="submit"
            isLoading={isLoading}
            fullWidth
            icon={ArrowRight}
          />
        </form>

        {/* Register link */}
        <p className="text-xs text-text-secondary text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="text-brand hover:text-brand-hover transition-colors font-semibold"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
