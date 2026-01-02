import { useNavigate } from 'react-router-dom';
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

const formatViews = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
};


export const VideoCard = ({ video, onDelete }: VideoCardProps) => {
  const navigate = useNavigate();
  const { channel, token } = useAuth();

  const isOwner = channel?.channel_id === video.channel_id;


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
  console.log(video.thumbnail_path)
  return (
    <div
      className="group animate-fade-in relative cursor-pointer"
      onClick={() => navigate(`/watch/${video.video_id}`)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-video-card mb-3">
        <img
          src={video.thumbnail_path}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget.src = '/placeholder.svg');
          }}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-primary-foreground ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div className="flex gap-3">
        {/* Channel avatar */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/channel/${video.channel_id}`);
          }}
        >
          <Avatar className="w-9 h-9">
            <AvatarImage src={video.profile_pic_path || undefined} />
            <AvatarFallback>
              {video.display_name?.[0]?.toUpperCase() ?? 'C'}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary">
            {video.title}
          </h3>

          <div
            className="text-sm text-muted-foreground hover:text-foreground w-fit"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/channel/${video.channel_id}`);
            }}
          >
            {video.display_name || 'Unknown Channel'}
          </div>

          <div className="text-xs text-muted-foreground flex gap-1">
            <span>{formatViews(video.views_count)}</span>
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
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-background/80 backdrop-blur-sm h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/edit/${video.video_id}`);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
