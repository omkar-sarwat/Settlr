// RegisterPage — sign up form with name, email, password + Zod validation
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Hexagon, Eye, EyeOff, UserPlus } from 'lucide-react';
import { registerUser } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

/** Sign up page — creates new account with name, email, password */
export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  async function onSubmit(data: RegisterFormValues) {
    setApiError('');
    setIsLoading(true);
    try {
      const response = await registerUser(data);
      setAuth(response.data.accessToken, response.data.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setApiError(axiosErr.response?.data?.message || 'Registration failed. Please try again.');
      } else {
        setApiError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gold glow background effect */}
      <div className="absolute w-96 h-96 bg-brand/5 blur-3xl rounded-full -z-10" />

      <div className="bg-bg-secondary rounded-lg shadow-lg p-8 max-w-md w-full border border-bg-tertiary space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Hexagon className="w-8 h-8 text-brand" />
            <span className="text-xl font-bold text-text-primary">SETTLR</span>
          </div>
          <p className="text-sm text-text-secondary">Create your account</p>
        </div>

        {/* Error */}
        {apiError && (
          <div className="bg-danger-bg border border-danger rounded-lg p-3 text-sm text-danger font-medium">
            {apiError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Arjun Kumar"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email address"
            type="email"
            placeholder="arjun@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            {...register('password')}
          />

          <Button
            label="Create Account"
            type="submit"
            fullWidth
            isLoading={isLoading}
            icon={UserPlus}
          />
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:text-brand-hover transition-colors font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
