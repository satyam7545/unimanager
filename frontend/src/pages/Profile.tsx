import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Mail, GraduationCap, Lock, Check, Loader2, ShieldAlert } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { GlassCard } from '@/components/GlassCard';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [semester, setSemester] = useState(user?.semester || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch dashboard stats for profile summary card
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name?: string; semester?: string | null }) => {
      return api.put('/auth/profile', payload);
    },
    onSuccess: (res) => {
      const updatedUser = res.data.user;
      updateUser(updatedUser);
      setProfileSuccess(true);
      setErrorMsg(null);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update profile.');
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (payload: { password?: string }) => {
      return api.put('/auth/profile', payload);
    },
    onSuccess: () => {
      setPasswordSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update password.');
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Name cannot be empty.');
      return;
    }
    updateProfileMutation.mutate({ name, semester: semester || null });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Password cannot be empty.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    updatePasswordMutation.mutate({ password });
  };

  return (
    <div className="space-y-8 select-none max-w-4xl mx-auto pb-12 select-text">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-serif">Student Profile</h2>
        <p className="text-sm text-zinc-400 mt-1">Manage your identity, view study statistics, and update credentials.</p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Stats & Identity Card */}
        <div className="space-y-6">
          <GlassCard hoverEffect={false} className="border-white/5 text-center p-6 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center font-extrabold text-2xl text-white mx-auto border border-white/10 shadow-lg shadow-primary/20">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">{user?.name}</h3>
                <span className="text-xs text-zinc-500">{user?.email}</span>
              </div>

              {user?.semester && (
                <span className="inline-block text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider">
                  Semester {user.semester}
                </span>
              )}
            </div>

            {/* Profile Statistics */}
            <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-6 mt-6 text-xs text-zinc-400 font-sans">
              <div className="text-center p-3 rounded-xl bg-white/[0.01] border border-white/5">
                <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Streak</span>
                <span className="text-xl font-extrabold text-orange-500 mt-1 block">{dashboardData?.studyStreak || 0}d</span>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/[0.01] border border-white/5">
                <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Pending</span>
                <span className="text-xl font-extrabold text-white mt-1 block">{dashboardData?.todaysTasks?.length || 0}</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Profile details form & password updates */}
        <div className="md:col-span-2 space-y-6">
          {/* Form 1: Details */}
          <GlassCard hoverEffect={false} className="border-white/5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-sm text-white">Identity Details</h4>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white glass-input"
                      required
                    />
                  </div>
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-zinc-500 bg-zinc-950/40 border border-white/5 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Semester Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Academic Semester</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                  >
                    <option value="">None / Not Applicable</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-4">
                <span className="text-[10px] text-zinc-500">Auto-saves to cloud database.</span>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="h-10 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : profileSuccess ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : null}
                  <span>{updateProfileMutation.isPending ? 'Saving...' : profileSuccess ? 'Changes Saved!' : 'Save Details'}</span>
                </button>
              </div>
            </form>
          </GlassCard>

          {/* Form 2: Password Updates */}
          <GlassCard hoverEffect={false} className="border-white/5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-sm text-white">Change Credentials</h4>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white glass-input"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white glass-input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-4">
                <span className="text-[10px] text-zinc-500">Security credentials are encrypted.</span>
                <button
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                  className="h-10 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updatePasswordMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : passwordSuccess ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : null}
                  <span>{updatePasswordMutation.isPending ? 'Updating...' : passwordSuccess ? 'Password Updated!' : 'Change Password'}</span>
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
