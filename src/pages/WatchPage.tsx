import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, ThumbsDown, Share2, Bookmark, Bell, BellOff } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { VideoCard } from '@/components/video/VideoCard';
import { CommentSection } from '@/components/video/CommentSection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Video, Channel, ReactionType } from '@/lib/models'; // Added ReactionType
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils'; // For conditional classes
import * as api from '@/lib/api';
import { toast } from 'sonner';

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
};

export const WatchPage = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [channelData, setChannelData] = useState<Channel | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userReaction, setUserReaction] = useState<ReactionType>('none');
  const [isLoading, setIsLoading] = useState(true);
  const { channel, token, isAuthenticated } = useAuth();

  useEffect(() => {
    loadVideo();
  }, [videoId, channel?.channel_id]);

  const loadVideo = async () => {
    if (!videoId) return;
    setIsLoading(true);
    
    try {
      const videoData = await api.getVideoDetail(videoId, channel?.channel_id || null);
      setVideo(videoData);
      
      // Immediate View Registration
      api.viewVideo(videoId).catch(err => console.error('View failed', err));

      const channelInfo = await api.getChannelDetail(videoData.channel_id);
      setChannelData(channelInfo);

      if (isAuthenticated && channel && token) {
        // Fetch Subscription Status
        const subs = await api.listSubscriptions(channel.channel_id, token, 0, 50);
        setIsSubscribed(subs.some(s => s.channel_id === videoData.channel_id));

        // Fetch User's current Reaction
        const reactionData = await api.getReaction(channel.channel_id, 'video', videoId);
        setUserReaction(reactionData.reaction);
      }

      // Related Videos Logic
      const accessibleList = await api.getAccessibleVideos(channel?.channel_id || null, 0, 10);
      const targetIds = accessibleList.filter(v => v.video_id !== videoId).slice(0, 6);
      const fullRelatedVideos = await Promise.all(
        targetIds.map(v => api.getVideoDetail(v.video_id, channel?.channel_id || null))
      );
      setRelatedVideos(fullRelatedVideos);

    } catch (err) {
      toast.error('Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProgressUpdate = async (seconds: number) => {
    if (isAuthenticated && channel && token && videoId) {
      try {
        await api.updateWatchHistory(channel.channel_id, videoId, seconds, token);
      } catch (err) {
        console.error('Progress sync failed');
      }
    }
  };

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!videoId || !channel || !token) {
      toast.error('Please sign in to react');
      return;
    }

    // Toggle logic: if clicking same reaction, set to 'none'
    const newReaction: ReactionType = userReaction === type ? 'none' : type;

    try {
      await api.setReaction(channel.channel_id, token, 'video', videoId, newReaction);
      setUserReaction(newReaction);
      
      // Refresh video details to update counts
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
        toast.success('Unsubscribed');
      } else {
        await api.subscribe(channelData.channel_id, channel.channel_id, token);
        setIsSubscribed(true);
        toast.success('Subscribed!');
      }
    } catch (err) {
      toast.error('Failed to update subscription');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="aspect-video bg-muted rounded-xl" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </Layout>
    );
  }

  if (!video) return null;

  return (
    <Layout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <VideoPlayer 
            videoPath={video.video_path} 
            onProgress={handleProgressUpdate} 
          />

          <h1 className="text-xl font-bold">{video.title}</h1>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={`/channel/${channelData?.channel_id}`}>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={channelData?.profile_pic_path} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {channelData?.display_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link to={`/channel/${channelData?.channel_id}`} className="font-semibold hover:text-primary transition-colors">
                  {channelData?.display_name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatCount(channelData?.subscriber_count || 0)} subscribers
                </p>
              </div>
              
              {channel?.channel_id !== channelData?.channel_id && (
                <Button
                  onClick={handleSubscribe}
                  variant={isSubscribed ? "secondary" : "default"}
                  className={!isSubscribed ? "glow" : ""}
                >
                  {isSubscribed ? <BellOff className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-secondary rounded-full overflow-hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleReaction('like')} 
                  className={cn(
                    "rounded-none px-4 border-r border-background/20",
                    userReaction === 'like' && "text-primary"
                  )}
                >
                  <ThumbsUp className={cn("w-4 h-4 mr-2", userReaction === 'like' && "fill-current")} />
                  {formatCount(video.like_count)}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleReaction('dislike')} 
                  className={cn(
                    "rounded-none px-4",
                    userReaction === 'dislike' && "text-destructive"
                  )}
                >
                  <ThumbsDown className={cn("w-4 h-4", userReaction === 'dislike' && "fill-current")} />
                </Button>
              </div>

              <Button variant="secondary" size="sm" onClick={handleShare} className="rounded-full">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>

              <Button variant="secondary" size="sm" className="rounded-full">
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          <div className="bg-secondary rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{formatCount(video.views_count)} views</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.upload_time), { addSuffix: true })}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{video.description}</p>
          </div>

          <Separator />
          <CommentSection videoId={video.video_id} />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Related Videos</h3>
          <div className="space-y-3">
            {relatedVideos.map((v) => (
              <VideoCard key={v.video_id} video={v} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};