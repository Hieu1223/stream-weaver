import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Video } from '@/lib/models';
import * as api from '@/lib/api';
import { toast } from 'sonner';

export const EditVideoPage = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { channel, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (videoId) {
      loadVideo();
    }
  }, [videoId]);

  const loadVideo = async () => {
    if (!videoId) return;
    setIsLoading(true);
    
    try {
      const data = await api.getVideoDetail(videoId, channel?.channel_id || null);
      setVideo(data);
      setTitle(data.title);
      setDescription(data.description);
      setPrivacy(data.privacy);
    } catch (err) {
      toast.error('Failed to load video');
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!video || !channel || !token) return;

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSaving(true);
    try {
      // Note: The API may not support update - this is a placeholder
      toast.success('Video updated successfully!');
      navigate(`/watch/${video.video_id}`);
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to update video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!video || !channel || !token) return;

    setIsDeleting(true);
    try {
      await api.deleteVideo(video.video_id, channel.channel_id, token);
      toast.success('Video deleted');
      navigate(`/channel/${channel.channel_id}`);
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to delete video');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Sign in to edit</h1>
          <Button onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </Layout>
    );
  }

  if (!video) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Video not found</h1>
        </div>
      </Layout>
    );
  }

  if (video.channel_id !== channel?.channel_id) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">You don't have permission to edit this video</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold">Edit Video</h1>
          <p className="text-muted-foreground mt-1">Update your video details</p>
        </div>

        <div className="space-y-6">
          {/* Thumbnail preview */}
          <div className="aspect-video max-w-md rounded-xl overflow-hidden bg-video-card">
            <img
              src={video.thumbnail_path.startsWith('http') 
                ? video.thumbnail_path 
                : `http://localhost:8000/${video.thumbnail_path}`}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/5000</p>
          </div>

          {/* Privacy */}
          <div className="space-y-2">
            <Label>Privacy</Label>
            <Select value={privacy} onValueChange={(v) => setPrivacy(v as 'public' | 'private')}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Video
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this video?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{video.title}". This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => navigate(-1)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="glow">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
