import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Video } from '@/lib/models';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { toast } from 'sonner';

interface VideoCardProps {
  video: Video & { display_name?: string; profile_pic_path?: string };
  onDelete?: () => void;
}

const formatViews = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
};

const getThumbnailUrl = (path: string): string => {
  if (path.startsWith('http')) return path;
  return `http://localhost:8000/${path}`;
};

const extractYouTubeId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const VideoCard = ({ video, onDelete }: VideoCardProps) => {
  const { channel, token } = useAuth();
  const navigate = useNavigate();
  const isOwner = channel?.channel_id === video.channel_id;
  
  const isYouTube = video.video_path?.includes('youtube.com') || video.video_path?.includes('youtu.be');
  const youtubeId = isYouTube ? extractYouTubeId(video.video_path) : null;
  
  const thumbnailUrl = youtubeId 
    ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    : getThumbnailUrl(video.thumbnail_path);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!channel || !token) return;
    
    try {
      await api.deleteVideo(video.video_id, channel.channel_id, token);
      toast.success('Video deleted');
      onDelete?.();
    } catch (err) {
      toast.error('Failed to delete video');
    }
  };

  return (
    <div className="group block animate-fade-in relative">
      <Link to={`/watch/${video.video_id}`}>
        <div className="relative aspect-video rounded-xl overflow-hidden bg-video-card mb-3">
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Hover play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center glow">
              <svg className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to={`/channel/${video.channel_id}`} onClick={(e) => e.stopPropagation()}>
            <Avatar className="w-9 h-9">
              <AvatarImage src={video.profile_pic_path !== 'no' ? video.profile_pic_path : undefined} />
              <AvatarFallback className="bg-secondary text-foreground text-sm">
                {video.display_name?.charAt(0).toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
            <Link 
              to={`/channel/${video.channel_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {video.display_name || 'Unknown Channel'}
            </Link>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>{formatViews(video.views_count)}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.upload_time), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Owner actions */}
      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm h-8 w-8"
              onClick={(e) => e.preventDefault()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); navigate(`/edit/${video.video_id}`); }}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
