import { useNavigate } from 'react-router-dom';
import { MoreVertical, Pencil, Trash2, Play } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface VideoCardProps {
  video: Video & { 
    display_name?: string; 
    profile_pic_path?: string; 
    upload_time?: string 
  };
  onDelete?: () => void;
  variant?: 'grid' | 'horizontal';
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

  /**
   * NAVIGATION HANDLERS
   * Use stopPropagation to ensure clicking buttons/avatars 
   * doesn't trigger the main card's onClick navigation.
   */
  const handleMainClick = () => navigate(`/watch/${video.video_id}`);
  
  const handleChannelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/channel/${video.channel_id}`);
  };

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

  /**
   * THUMBNAIL FALLBACK LOGIC
   * Automatically moves down the quality chain if the requested image 404s.
   */
  const handleThumbnailError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src.includes('maxresdefault')) {
      target.src = target.src.replace('maxresdefault', 'hqdefault');
    } else if (target.src.includes('hqdefault')) {
      target.src = target.src.replace('hqdefault', 'default');
    } else {
      target.src = '/placeholder.svg';
    }
  };

  return (
    <div
      className={cn(
        "group animate-fade-in relative cursor-pointer transition-all",
        isHorizontal ? "flex flex-col md:flex-row gap-4 mb-6" : "flex flex-col gap-3"
      )}
      onClick={handleMainClick}
    >
      {/* Thumbnail Section */}
      <div className={cn(
        "relative rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 shadow-sm",
        isHorizontal ? "w-full md:w-[360px] aspect-video" : "w-full aspect-video"
      )}>
        <img
          src={video.thumbnail_path}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={handleThumbnailError}
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
              <Play className="w-6 h-6 text-white fill-current ml-1" />
           </div>
        </div>
      </div>

      {/* Info Section */}
      <div className={cn("flex gap-3 min-w-0", isHorizontal ? "flex-1 pt-1" : "px-1")}>
        {/* Only show large Avatar in Grid mode */}
        {!isHorizontal && (
          <Avatar 
            className="w-9 h-9 border border-border/40 hover:opacity-80 transition-opacity"
            onClick={handleChannelClick}
          >
            <AvatarImage src={video.profile_pic_path} />
            <AvatarFallback className="bg-secondary text-xs font-bold">
              {video.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0 relative">
          <h3 className={cn(
            "font-semibold leading-tight mb-1 text-foreground line-clamp-1 transition-colors group-hover:text-primary",
            isHorizontal ? "text-lg md:text-xl" : "text-sm"
          )}>
            {video.title}
          </h3>

          <div className="flex flex-col text-sm text-muted-foreground">
            {/* Channel Link */}
            <div className={cn("flex items-center gap-2", isHorizontal ? "my-2" : "mt-0.5")}>
              {isHorizontal && (
                <Avatar className="w-6 h-6 border border-border/40" onClick={handleChannelClick}>
                  <AvatarImage src={video.profile_pic_path} />
                  <AvatarFallback className="text-[10px]">{video.display_name?.[0]}</AvatarFallback>
                </Avatar>
              )}
              <span 
                className="hover:text-foreground transition-colors truncate font-medium"
                onClick={handleChannelClick}
              >
                {video.display_name || 'Loading...'}
              </span>
            </div>

            {/* Stats Meta */}
            <div className="flex items-center gap-1.5 text-xs">
              <span>{formatViews(video.views_count)}</span>
              <span className="text-[10px] opacity-50">•</span>
              <span>
                {video.upload_time 
                  ? formatDistanceToNow(new Date(video.upload_time), { addSuffix: true }) 
                  : 'recently'}
              </span>
            </div>
            
            {/* Description (Horizontal Only) */}
            {isHorizontal && video.description && (
              <p className="hidden md:block mt-3 text-xs line-clamp-2 text-muted-foreground/80 leading-relaxed max-w-2xl">
                {video.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Menu (Top-Right) */}
      {isOwner && (
        <div className="absolute right-0 top-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/edit/${video.video_id}`); }}>
                <Pencil className="w-4 h-4 mr-2" /> Edit Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};