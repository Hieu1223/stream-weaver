import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ThumbsUp, ThumbsDown, Share2, Bookmark, 
  Bell, BellOff, ListPlus, Loader2, LogIn, 
  Plus
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { VideoCard } from '@/components/video/VideoCard';
import { CommentSection } from '@/components/video/CommentSection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Channel, ReactionType, Playlist } from '@/lib/models';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import { toast } from 'sonner';

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
};

export const WatchPage = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { channel, token, isAuthenticated } = useAuth();

  // State
  const [video, setVideo] = useState<Video | null>(null);
  const [channelData, setChannelData] = useState<Channel | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userReaction, setUserReaction] = useState<ReactionType>('none');
  const [isLoading, setIsLoading] = useState(true);

  // Playlist Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const loadVideoData = useCallback(async () => {
    if (!videoId) return;
    setIsLoading(true);
    
    try {
      // 1. Fetch Video Detail & Register View
      const videoData = await api.getVideoDetail(videoId, channel?.channel_id || null);
      setVideo(videoData);
      api.viewVideo(videoId).catch(() => {});

      // 2. Fetch Channel Info
      const channelInfo = await api.getChannelDetail(videoData.channel_id);
      setChannelData(channelInfo);

      // 3. Auth-dependent data
      if (isAuthenticated && channel && token) {
        // Check subscription status
        const subStatus = await api.checkSubscriptionStatus(channel.channel_id, videoData.channel_id);
        setIsSubscribed(subStatus.is_subscribed);

        // Fetch current reaction
        const reactionData = await api.getReaction(channel.channel_id, 'video', videoId);
        setUserReaction(reactionData.reaction);
      }

      // 4. Related Videos (using accessible videos)
      const accessibleList = await api.getAccessibleVideos(channel?.channel_id || null, 0, 10);
      const filtered = accessibleList.filter(v => v.video_id !== videoId).slice(0, 8);
      // Enriching lightweight videos to full Video objects for the cards if necessary
      const fullRelated = await Promise.all(
        filtered.map(v => api.getVideoDetail(v.video_id, channel?.channel_id || null))
      );
      setRelatedVideos(fullRelated);

    } catch (err) {
      toast.error('Failed to load video content');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, channel, token, isAuthenticated]);

  useEffect(() => {
    loadVideoData();
  }, [loadVideoData]);

  const handleProgressUpdate = async (seconds: number) => {
    if (isAuthenticated && channel && token && videoId) {
      try {
        await api.updateWatchHistory(channel.channel_id, videoId, Math.floor(seconds), token);
      } catch (err) {
        console.error('History sync failed');
      }
    }
  };

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!videoId || !channel || !token) {
      toast.error('Please sign in to react');
      return;
    }

    const newReaction: ReactionType = userReaction === type ? 'none' : type;

    try {
      await api.setReaction(channel.channel_id, token, 'video', videoId, newReaction);
      setUserReaction(newReaction);
      
      // Refresh video to update the like counter UI
      const updated = await api.getVideoDetail(videoId, channel.channel_id);
      setVideo(updated);
    } catch (err) {
      toast.error('Failed to update reaction');
    }
  };

  const handleSubscribe = async () => {
    if (!channelData || !channel || !token) {
      toast.error('Please sign in to subscribe');
      return;
    }

    try {
      if (isSubscribed) {
        await api.unsubscribe(channelData.channel_id, channel.channel_id, token);
        setIsSubscribed(false);
        toast.success(`Unsubscribed from ${channelData.display_name}`);
      } else {
        await api.subscribe(channelData.channel_id, channel.channel_id, token);
        setIsSubscribed(true);
        toast.success(`Subscribed to ${channelData.display_name}!`);
      }
    } catch (err) {
      toast.error('Subscription update failed');
    }
  };

  const handleOpenSaveModal = async () => {
    if (!isAuthenticated || !channel) {
      toast.error("Please sign in to save videos");
      return;
    }
    setIsSaveModalOpen(true);
    setIsLoadingPlaylists(true);
    try {
      const data = await api.getChannelPlaylists(channel.channel_id, 0, 50);
      setUserPlaylists(data as Playlist[]);
    } catch (err) {
      toast.error("Failed to fetch your playlists");
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!token || !videoId) return;
    try {
      await api.addVideoToPlaylist(playlistId, videoId, token);
      toast.success("Added to playlist");
      setIsSaveModalOpen(false);
    } catch (err: any) {
      toast.error(err.detail || "Video is already in this playlist");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="aspect-video bg-muted rounded-xl w-full" />
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!video) return null;

  handleProgressUpdate(0)
  return (
    <Layout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-4">
          <VideoPlayer 
            videoPath={video.video_path} 
            onProgress={handleProgressUpdate} 
          />

          <h1 className="text-2xl font-bold leading-tight">{video.title}</h1>

          <div className="flex flex-wrap items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-4">
              <Link to={`/channel/${channelData?.channel_id}`}>
                <Avatar className="w-10 h-10 border">
                  <AvatarImage src={channelData?.profile_pic_path} />
                  <AvatarFallback className="bg-primary text-white">
                    {channelData?.display_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex flex-col">
                <Link to={`/channel/${channelData?.channel_id}`} className="font-bold hover:text-primary transition-colors">
                  {channelData?.display_name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatCount(channelData?.subscriber_count || 0)} subscribers
                </span>
              </div>
              
              {channel?.channel_id !== channelData?.channel_id && (
                <Button
                  onClick={handleSubscribe}
                  variant={isSubscribed ? "secondary" : "default"}
                  className={cn("rounded-full ml-2", !isSubscribed && "bg-foreground text-background hover:bg-foreground/90")}
                  size="sm"
                >
                  {isSubscribed ? <BellOff className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Like/Dislike Group */}
              <div className="flex items-center bg-secondary rounded-full h-9">
                <button 
                  onClick={() => handleReaction('like')} 
                  className={cn(
                    "flex items-center gap-2 px-4 h-full rounded-l-full border-r border-background/20 hover:bg-muted transition-colors",
                    userReaction === 'like' && "text-primary"
                  )}
                >
                  <ThumbsUp className={cn("w-4 h-4", userReaction === 'like' && "fill-current")} />
                  <span className="text-sm font-medium">{formatCount(video.like_count)}</span>
                </button>
                <button 
                  onClick={() => handleReaction('dislike')} 
                  className={cn(
                    "flex items-center px-4 h-full rounded-r-full hover:bg-muted transition-colors",
                    userReaction === 'dislike' && "text-destructive"
                  )}
                >
                  <ThumbsDown className={cn("w-4 h-4", userReaction === 'dislike' && "fill-current")} />
                </button>
              </div>

              <Button variant="secondary" size="sm" onClick={handleShare} className="rounded-full h-9">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>

              <Button variant="secondary" size="sm" onClick={handleOpenSaveModal} className="rounded-full h-9">
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          {/* Video Description Box */}
          <div className="bg-secondary/50 rounded-xl p-4 text-sm">
            <div className="flex gap-3 font-bold mb-1">
              <span>{formatCount(video.views_count)} views</span>
              <span>{formatDistanceToNow(new Date(video.upload_time), { addSuffix: true })}</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{video.description}</p>
          </div>

          <Separator className="my-6" />
          <CommentSection videoId={video.video_id} />
        </div>

        {/* Sidebar Related Videos */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Up Next</h3>
          <div className="flex flex-col gap-4">
            {relatedVideos.map((v) => (
              <VideoCard key={v.video_id} video={v} />
            ))}
          </div>
        </div>
      </div>

      {/* Save to Playlist Modal */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="w-5 h-5" />
              Save to playlist
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="mt-4 max-h-[60vh] pr-4">
            {isLoadingPlaylists ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : userPlaylists.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-sm text-muted-foreground">You don't have any playlists yet.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/playlists">Create your first playlist</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {userPlaylists.map((pl) => (
                  <button
                    key={pl.playlist_id}
                    onClick={() => handleAddToPlaylist(pl.playlist_id)}
                    className="w-full flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors text-left group"
                  >
                    <span className="font-medium text-sm">{pl.playlist_name}</span>
                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};