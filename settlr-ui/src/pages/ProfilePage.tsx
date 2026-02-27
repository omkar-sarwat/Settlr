/**
 * Profile Page — View and edit user profile (name, email, phone)
 * 
 * Shows:
 * - Large avatar with initials
 * - Editable name and phone fields
 * - Read-only email and account info
 * - KYC status badge
 * - Account creation date
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, Calendar, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAccounts } from '@/hooks/useAccounts';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Account } from '@/types';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: accountsData } = useAccounts();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // Populate fields from profile data or auth store
  const profile = profileData || user;

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Track if form has been modified
  useEffect(() => {
    if (profile) {
      const nameChanged = name !== (profile.name || '');
      const phoneChanged = phone !== (profile.phone || '');
      setIsDirty(nameChanged || phoneChanged);
      setSaved(false);
    }
  }, [name, phone, profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ name: name.trim() || undefined, phone: phone.trim() || undefined });
      setSaved(true);
      setIsDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Error handled by mutation
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const accounts = accountsData?.data || [];
  const totalBalance = accounts.reduce((sum: number, acc: Account) => sum + acc.balance, 0);

  const kycBadgeVariant = profile?.kycStatus === 'verified' ? 'success'
    : profile?.kycStatus === 'rejected' ? 'danger' : 'warning';

  if (profileLoading) {
    return (
      <PageWrapper>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Profile</h1>
          <p className="text-text-secondary">Manage your personal information</p>
        </div>

        {/* Avatar + Name Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <GlassCard variant="elevated" className="flex items-center gap-6">
            {/* Large Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center text-primary-400 text-2xl font-bold shrink-0">
              {getInitials(name || profile?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-text-primary truncate">
                {name || profile?.name || 'Set your name'}
              </h2>
              <p className="text-text-secondary truncate">{profile?.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={kycBadgeVariant}>
                  <Shield className="w-3 h-3" />
                  KYC: {profile?.kycStatus || 'pending'}
                </Badge>
                {accounts.length > 0 && (
                  <Badge variant="primary">
                    {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                  </Badge>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <GlassCard>
            <h3 className="text-lg font-semibold text-text-primary mb-6">Personal Information</h3>
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="input-glass w-full"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  readOnly
                  className="input-glass w-full opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-text-muted mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="input-glass w-full"
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!isDirty || updateProfile.isPending}
                  className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {updateProfile.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{updateProfile.isPending ? 'Saving...' : 'Save Changes'}</span>
                </button>

                {saved && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-success-400 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Profile updated!</span>
                  </motion.div>
                )}

                {updateProfile.isError && (
                  <div className="flex items-center gap-1 text-danger-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Failed to save. Try again.</span>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Account Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <GlassCard>
            <h3 className="text-lg font-semibold text-text-primary mb-6">Account Details</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                <span className="text-text-secondary text-sm">User ID</span>
                <span className="text-text-primary text-sm font-mono">{profile?.id?.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                <span className="text-text-secondary text-sm">Total Balance</span>
                <span className="text-text-primary text-sm font-mono font-semibold">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(totalBalance / 100)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                <span className="text-text-secondary text-sm">Accounts</span>
                <span className="text-text-primary text-sm">{accounts.length}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Member since</span>
                </div>
                <span className="text-text-primary text-sm">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
