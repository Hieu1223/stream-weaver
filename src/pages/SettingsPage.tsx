import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Save,
  Trash2,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { toast } from 'sonner';

const BASE_URL = 'http://localhost:8000';

export const SettingsPage = () => {
  const {
    channel,
    token,
    login,
    logout,
    refreshChannel,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ================= PROFILE ================= */
  const [displayName, setDisplayName] = useState(channel?.display_name ?? '');
  const [description, setDescription] = useState(channel?.description ?? '');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /* ================= CREDENTIALS ================= */
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  const [oldUsername, setOldUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* ================= DELETE ================= */
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isAuthenticated || !channel) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">
            Sign in to access settings
          </h1>
          <Button onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  const profilePic =
    channel.profile_pic_path?.includes('files/')
      ? `${BASE_URL}/${channel.profile_pic_path}.jpg`
      : channel.profile_pic_path;

  /* ================= HANDLERS ================= */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!token) return;

    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    setIsSaving(true);
    try {
      await api.updateChannel(channel.channel_id, {
        auth_token: token,
        display_name: displayName,
        description,
        profile_pic: profileFile ?? undefined,
      });

      await refreshChannel();
      setProfileFile(null);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCredentialsChange = async () => {
    if (!oldUsername || !oldPassword) {
      toast.error('Old username and password are required');
      return;
    }

    if (!newUsername && !newPassword) {
      toast.error('Enter a new username or password');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsUpdatingCredentials(true);
    try {
      // 1️⃣ Authenticate with OLD credentials
      const auth = await api.getToken(oldUsername, oldPassword);

      // 2️⃣ Update channel
      const res = await api.updateChannel(channel.channel_id, {
        auth_token: auth.auth_token,
        username: newUsername || oldUsername,
        password: newPassword || oldPassword,
      });

      // 3️⃣ Update auth context with NEW token
      if (res.auth_token) {
        await login(
          newUsername || oldUsername,
          newPassword || oldPassword
        );
      }

      await refreshChannel();

      // Cleanup
      setOldUsername('');
      setOldPassword('');
      setNewUsername('');
      setNewPassword('');
      setConfirmPassword('');
      setCredentialsOpen(false);

      toast.success('Credentials updated');
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to update credentials');
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;

    setIsDeleting(true);
    try {
      await api.deleteChannel(channel.channel_id, token);
      logout();
      navigate('/');
      toast.success('Channel deleted');
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to delete channel');
    } finally {
      setIsDeleting(false);
    }
  };

  /* ================= RENDER ================= */

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Channel Settings</h1>

        {/* PROFILE */}
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={previewUrl || profilePic} />
                <AvatarFallback>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-secondary rounded-full"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Label>Display Name</Label>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />

          <Label>About</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} />

          <Button onClick={handleSaveProfile} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <Separator />

        {/* CREDENTIALS */}
        <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <KeyRound className="w-4 h-4 mr-2" />
              Change Credentials
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Credentials</DialogTitle>
              <DialogDescription>
                Authenticate with old credentials to change username or password.
              </DialogDescription>
            </DialogHeader>

            <Input placeholder="Old username" value={oldUsername} onChange={e => setOldUsername(e.target.value)} />
            <Input type="password" placeholder="Old password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />

            <Input placeholder="New username (optional)" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
            <Input type="password" placeholder="New password (optional)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />

            <DialogFooter>
              <Button onClick={handleCredentialsChange} disabled={isUpdatingCredentials}>
                {isUpdatingCredentials ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Separator />

        {/* DELETE */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Channel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};
