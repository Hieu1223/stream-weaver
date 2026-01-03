import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListVideo, X, ChevronUp, ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Video, Playlist } from '@/lib/models';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';

interface PlaylistSidebarProps {
  playlistId: string;
  currentVideoId: string;
  onClose: () => void;
}

export const PlaylistSidebar = ({ playlistId, currentVideoId, onClose }: PlaylistSidebarProps) => {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Partial<Video>[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlaylist = async () => {
      setIsLoading(true);
      try {
        const videoList = await api.getPlaylistVideos(playlistId);
        setVideos(videoList);
      } catch (err) {
        console.error('Failed to load playlist', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPlaylist();
  }, [playlistId]);

  const currentIndex = videos.findIndex(v => v.video_id === currentVideoId);

  if (isLoading) {
    return (
      <div className="bg-secondary/50 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-3/4 mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Playlist</h3>
            <p className="text-xs text-muted-foreground">
              {currentIndex + 1} / {videos.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video List */}
      {!isCollapsed && (
        <ScrollArea className="max-h-[400px]">
          <div className="p-2 space-y-1">
            {videos.map((video, index) => (
              <Link
                key={video.video_id}
                to={`/watch/${video.video_id}?playlist=${playlistId}`}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-accent",
                  video.video_id === currentVideoId && "bg-accent"
                )}
              >
                <span className="text-xs text-muted-foreground w-5 text-center">
                  {video.video_id === currentVideoId ? '▶' : index + 1}
                </span>
                <img
                  src={video.thumbnail_path || '/placeholder.svg'}
                  alt={video.title}
                  className="w-20 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
