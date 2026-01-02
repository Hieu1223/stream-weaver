import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Save, Trash2, AlertTriangle } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { channel, token, logout, refreshChannel, isAuthenticated } = useAuth();
  const [displayName, setDisplayName] = useState(channel?.display_name || '');
  const [description, setDescription] = useState(channel?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const handleSave = async () => {
    if (!channel || !token) return;

    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    setIsSaving(true);
    try {
      await api.updateChannel(channel.channel_id, {
        display_name: displayName,
        description,
        auth_token: token,
      });
      await refreshChannel();
      toast.success('Channel updated successfully!');
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to update channel');
    } finally {
      setIsSaving(false);
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
                <AvatarImage 
                  src={channel.profile_pic_path !== 'no' ? channel.profile_pic_path : undefined} 
                />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {displayName.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
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
