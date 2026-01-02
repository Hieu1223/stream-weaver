import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Film, X, Image } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { toast } from 'sonner';

export const UploadPage = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useUrl, setUseUrl] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { channel, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      setVideoFile(file);
      setUseUrl(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !channel || !token) {
      toast.error('Please sign in to upload');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!videoFile && !videoUrl.trim()) {
      toast.error('Please provide a video file or YouTube URL');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let videoBlob: Blob;
      
      if (useUrl && videoUrl.trim()) {
        // For YouTube URLs, we create a minimal blob with the URL as content
        videoBlob = new Blob([videoUrl], { type: 'text/plain' });
      } else if (videoFile) {
        videoBlob = videoFile;
      } else {
        throw new Error('No video provided');
      }

      const response = await api.createVideo(
        channel.channel_id,
        token,
        title,
        description,
        videoBlob
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success('Video uploaded successfully!');
      navigate(`/watch/${response.video.video_id}`);
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Sign in to upload</h1>
          <Button onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold">Upload Video</h1>
          <p className="text-muted-foreground mt-1">Share your content with the world</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video source selection */}
          <div className="space-y-4">
            <Label>Video Source</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={!useUrl ? 'default' : 'secondary'}
                onClick={() => setUseUrl(false)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
              <Button
                type="button"
                variant={useUrl ? 'default' : 'secondary'}
                onClick={() => setUseUrl(true)}
              >
                <Film className="w-4 h-4 mr-2" />
                YouTube URL
              </Button>
            </div>
          </div>

          {/* Video upload or URL input */}
          {!useUrl ? (
            <div className="space-y-4">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
              
              {videoFile ? (
                <div className="relative p-4 bg-secondary rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Film className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{videoFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setVideoFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium">Click to select video file</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    MP4, WebM, or other video formats
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="videoUrl">YouTube URL</Label>
              <Input
                id="videoUrl"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="h-12"
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              type="text"
              placeholder="Enter video title"
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
              placeholder="Tell viewers about your video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/5000</p>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 glow" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Video'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};
