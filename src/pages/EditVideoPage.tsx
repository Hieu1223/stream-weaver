import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Trash2, Camera, ChevronLeft } from 'lucide-react';
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
import { Separator } from '@radix-ui/react-dropdown-menu';

export const EditVideoPage = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { channel, token, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data States
  const [video, setVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'limited'>('public');
  
  // File States
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Status States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (videoId) {
      loadVideo();
    }
  }, [videoId, channel?.channel_id]);

  const loadVideo = async () => {
    if (!videoId) return;
    setIsLoading(true);
    
    try {
      // Fetch current metadata to populate the form
      const data = await api.getVideoDetail(videoId, channel?.channel_id || null);
      
      // Security Check: Only allow owner to edit
      if (channel && data.channel_id !== channel.channel_id) {
        toast.error("Unauthorized: You do not own this video");
        navigate('/');
        return;
      }

      setVideo(data);
      setTitle(data.title);
      setDescription(data.description);
      setPrivacy(data.privacy);
    } catch (err) {
      toast.error('Failed to load video details');
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      // Create local preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = async () => {
    if (!video || !channel || !token || !videoId) return;

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSaving(true);
    try {
      // Calling the Multipart/Form-Data API
      await api.updateVideo(channel.channel_id, videoId, {
        auth_token: token,
        title: title.trim(),
        description: description.trim(),
        privacy,
        thumbnail_file: thumbnailFile || undefined,
      });

      toast.success('Video updated successfully!');
      navigate(`/watch/${videoId}`);
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
      toast.success('Video permanently deleted');
      navigate(`/channel/${channel.channel_id}`);
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to delete video');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Render Helpers ---

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <h1 className="text-2xl font-bold">Please sign in to manage videos</h1>
          <Button onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="aspect-video bg-muted rounded-xl" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </Layout>
    );
  }

  if (!video) return null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Edit Video Details</h1>
            <p className="text-muted-foreground">Modify metadata and visibility</p>
          </div>
        </div>

        <div className="grid gap-8">
          {/* Thumbnail Section */}
          <div className="space-y-3">
            <Label className="text-base">Thumbnail</Label>
            <div 
              className="relative aspect-video max-w-md rounded-xl overflow-hidden bg-secondary group cursor-pointer border-2 border-transparent hover:border-primary transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <img
                src={previewUrl || (video.thumbnail_path.startsWith('http') 
                  ? video.thumbnail_path 
                  : `http://localhost:8000/${video.thumbnail_path}`)}
                alt="Thumbnail preview"
                className="w-full h-full object-cover group-hover:brightness-50 transition-all"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                <Camera className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">Upload New Image</p>
              </div>
              <input 
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleThumbnailChange}
              />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Click the image to upload a custom thumbnail.
            </p>
          </div>

          {/* Metadata Form */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Video Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a catchy title"
                className="h-12"
                maxLength={100}
              />
              <p className="text-xs text-right text-muted-foreground">{title.length}/100</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is your video about?"
                className="min-h-[150px] resize-none"
                maxLength={5000}
              />
              <p className="text-xs text-right text-muted-foreground">{description.length}/5000</p>
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={privacy} onValueChange={(v) => setPrivacy(v as 'public' | 'private')}>
                <SelectTrigger className="h-12 w-full sm:w-[200px]">
                  <SelectValue placeholder="Select privacy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (Everyone)</SelectItem>
                  <SelectItem value="private">Private (Only you)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Video
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <span className="font-bold text-foreground">"{video.title}"</span>. 
                    This action cannot be undone and will remove all views and engagement.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate(-1)} disabled={isSaving}>
                Discard
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !title.trim()} className="px-8 shadow-glow transition-all">
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