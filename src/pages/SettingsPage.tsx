import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Save, Trash2, AlertTriangle, KeyRound, User } from 'lucide-react';
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

export const SettingsPage = () => {
  const { channel, token, logout, refreshChannel, isAuthenticated, login } = useAuth();
  const [displayName, setDisplayName] = useState(channel?.display_name || '');
  const [description, setDescription] = useState(channel?.description || '');

  // Profile Picture States
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Password Change States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Username Change States
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = async () => {
    if (!channel || !token) return;

    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    setIsSaving(true);
    try {
      await api.updateChannel(channel.channel_id, {
        auth_token: token,
        display_name: displayName,
        description: description,
        profile_pic: profileFile || undefined,
      });

      await refreshChannel();
      setProfileFile(null);
      toast.success('Channel updated successfully!');
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to update channel');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!channel) return;

    if (!oldPassword.trim()) {
      toast.error('Please enter your current password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      // First get a token with old credentials to verify
      const authResponse = await api.getToken(channel.username, oldPassword);
      
      // Use the fresh token to update password
      await api.updateChannel(channel.channel_id, {
        auth_token: authResponse.auth_token,
        password: newPassword,
      });

      // Re-login with new password
      await login(channel.username, newPassword);
      
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordDialogOpen(false);
      toast.success('Password changed successfully!');
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to change password. Check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUsernameChange = async () => {
    if (!channel) return;

    if (!newUsername.trim()) {
      toast.error('Please enter a new username');
      return;
    }

    if (!usernamePassword.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsChangingUsername(true);
    try {
      // Get token with current credentials
      const authResponse = await api.getToken(channel.username, usernamePassword);
      
      // Update username
      await api.updateChannel(channel.channel_id, {
        auth_token: authResponse.auth_token,
        username: newUsername,
      });

      // Re-login with new username
      await login(newUsername, usernamePassword);
      
      setNewUsername('');
      setUsernamePassword('');
      setUsernameDialogOpen(false);
      toast.success('Username changed successfully!');
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to change username. Check your password.');
    } finally {
      setIsChangingUsername(false);
    }
  };

  const handleDelete = async () => {
    if (!channel || !token) return;

    setIsDeleting(true);
    try {
      await api.deleteChannel(channel.channel_id, token);
      logout();
      toast.success('Channel deleted');
      navigate('/');
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to delete channel');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated || !channel) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Sign in to access settings</h1>
          <Button onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  var profile_pic_path = channel.profile_pic_path;
  if (profile_pic_path.includes('files/')) {
    profile_pic_path = `http://localhost:8000/${profile_pic_path}.jpg`;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold">Channel Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your channel profile</p>
        </div>

        {/* Profile section */}
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={previewUrl || profile_pic_path} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {displayName.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-secondary rounded-full border border-border hover:bg-muted transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="font-semibold">{channel.display_name}</h3>
              <p className="text-sm text-muted-foreground">@{channel.username}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">About</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers about your channel"
                className="min-h-[120px] resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="glow">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Separator />

        {/* Account Security Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Account Security
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Change Username Dialog */}
            <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <User className="w-4 h-4 mr-2" />
                  Change Username
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Username</DialogTitle>
                  <DialogDescription>
                    Enter your password and new username.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUsername">New Username</Label>
                    <Input
                      id="newUsername"
                      type="text"
                      placeholder="Enter new username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usernamePassword">Your Password</Label>
                    <Input
                      id="usernamePassword"
                      type="password"
                      placeholder="Enter your password"
                      value={usernamePassword}
                      onChange={(e) => setUsernamePassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUsernameDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUsernameChange} disabled={isChangingUsername}>
                    {isChangingUsername ? 'Changing...' : 'Change Username'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <KeyRound className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and a new password.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">Current Password</Label>
                    <Input
                      id="oldPassword"
                      type="password"
                      placeholder="Enter current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Separator />

        {/* Danger zone */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>

          <div className="p-4 border border-destructive/30 rounded-xl bg-destructive/5">
            <h3 className="font-medium">Delete Channel</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Permanently delete your channel and all associated videos. This action cannot be undone.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Channel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your channel "{channel.display_name}" and all your videos.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Channel'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Layout>
  );
};
