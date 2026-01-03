import { useNavigate } from 'react-router-dom';
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
import { cn } from '@/lib/utils'; // Assuming you have shadcn's utility

interface VideoCardProps {
  video: Video & { display_name?: string; profile_pic_path?: string };
  onDelete?: () => void;
  variant?: 'grid' | 'horizontal'; // The new flag
}

const formatViews = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
};

export const VideoCard = ({ video, onDelete, variant = 'grid' }: VideoCardProps) => {
  const navigate = useNavigate();
  const { channel, token } = useAuth();
  const isOwner = channel?.channel_id === video.channel_id;

  const isHorizontal = variant === 'horizontal';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!channel || !token) return;
    try {
      await api.deleteVideo(video.video_id, channel.channel_id, token);
      toast.success('Video deleted');
      onDelete?.();
    } catch {
      toast.error('Failed to delete video');
    }
  };

  return (
    <div
      className={cn(
        "group animate-fade-in relative cursor-pointer gap-4",
        isHorizontal ? "flex flex-col md:flex-row items-start mb-4" : "flex flex-col"
      )}
      onClick={() => navigate(`/watch/${video.video_id}`)}
    >
      {/* Thumbnail Container */}
      <div className={cn(
        "relative rounded-xl overflow-hidden bg-video-card flex-shrink-0",
        isHorizontal ? "w-full md:w-[360px] aspect-video" : "w-full aspect-video mb-3"
      )}>
        <img
          src={video.thumbnail_path}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { (e.currentTarget.src = '/placeholder.svg'); }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className={cn("flex gap-3", isHorizontal ? "flex-1 pt-1" : "w-full")}>
        {/* Hide avatar in horizontal mode if you want it next to channel name instead (standard YT) */}
        {!isHorizontal && (
          <div onClick={(e) => { e.stopPropagation(); navigate(`/channel/${video.channel_id}`); }}>
            <Avatar className="w-9 h-9">
              <AvatarImage src={video.profile_pic_path || undefined} />
              <AvatarFallback>{video.display_name?.[0]?.toUpperCase() ?? 'C'}</AvatarFallback>
            </Avatar>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-medium group-hover:text-primary leading-tight mb-1",
            isHorizontal ? "text-lg md:text-xl line-clamp-2" : "text-sm line-clamp-2"
          )}>
            {video.title}
          </h3>

          <div className={cn("flex text-muted-foreground", isHorizontal ? "flex-col" : "flex-col")}>
            <div className={cn("flex items-center gap-2", isHorizontal ? "my-2" : "")}>
              {isHorizontal && (
                <Avatar className="w-6 h-6">
                  <AvatarImage src={video.profile_pic_path || undefined} />
                  <AvatarFallback>{video.display_name?.[0]?.toUpperCase() ?? 'C'}</AvatarFallback>
                </Avatar>
              )}
              <span 
                className="text-sm hover:text-foreground transition-colors"
                onClick={(e) => { e.stopPropagation(); navigate(`/channel/${video.channel_id}`); }}
              >
                {video.display_name || 'Unknown Channel'}
              </span>
            </div>

            <div className="text-xs flex items-center gap-1">
              <span>{formatViews(video.views_count)}</span>
            </div>
            
            {/* Description Section */}
              {isHorizontal && (
                <div className="hidden md:block mt-3 min-w-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {video.description || "No description available."}
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Owner actions */}
      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute opacity-0 group-hover:opacity-100 bg-background/80 backdrop-blur-sm h-8 w-8",
                isHorizontal ? "top-2 right-2 md:relative md:top-0 md:right-0" : "top-2 right-2"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/edit/${video.video_id}`); }}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};