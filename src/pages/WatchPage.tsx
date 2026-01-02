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
import { Video, Channel } from '@/lib/models';
import { useAuth } from '@/contexts/AuthContext';
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
  const [isLoading, setIsLoading] = useState(true);
  const { channel, token, isAuthenticated } = useAuth();

  useEffect(() => {
    loadVideo();
  }, [videoId]);

  const loadVideo = async () => {
    if (!videoId) return;
    setIsLoading(true);
    
    try {
      const videoData = await api.getVideoDetail(videoId, channel?.channel_id || null);
      setVideo(videoData);

      const channelInfo = await api.getChannelDetail(videoData.channel_id);
      setChannelData(channelInfo);

      // Load related videos
      const accessibleIds = await api.getAccessibleVideos(channel?.channel_id || null, 0, 10);
      const related = await Promise.all(
        accessibleIds
          .filter(v => v.video_id !== videoId)
          .slice(0, 5)
          .map(async (v) => {
            const detail = await api.getVideoDetail(v.video_id, channel?.channel_id || null);
            const ch = await api.getChannelDetail(detail.channel_id);
            return { ...detail, display_name: ch.display_name, profile_pic_path: ch.profile_pic_path };
          })
      );
      setRelatedVideos(related);
    } catch (err) {
      toast.error('Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async () => {
    if (videoId) {
      try {
        await api.viewVideo(videoId);
      } catch (err) {
        console.error('Failed to register view');
      }
    }
  };

  const handleLike = async () => {
    if (!videoId) return;
    try {
      await api.likeVideo(videoId);
      loadVideo();
      toast.success('Liked!');
    } catch (err) {
      toast.error('Failed to like video');
    }
  };

  const handleDislike = async () => {
    if (!videoId) return;
    try {
      await api.dislikeVideo(videoId);
      loadVideo();
    } catch (err) {
      toast.error('Failed to dislike video');
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

  if (!video) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Video not found</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-4">
          <VideoPlayer videoPath={video.video_path} onView={handleView} />

          <h1 className="text-xl font-bold">{video.title}</h1>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Channel info */}
            <div className="flex items-center gap-4">
              <Link to={`/channel/${channelData?.channel_id}`}>
                <Avatar className="w-12 h-12">
                  <AvatarImage 
                    src={channelData?.profile_pic_path !== 'no' ? channelData?.profile_pic_path : undefined} 
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {channelData?.display_name?.charAt(0).toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link 
                  to={`/channel/${channelData?.channel_id}`}
                  className="font-semibold hover:text-primary transition-colors"
                >
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
                  {isSubscribed ? (
                    <>
                      <BellOff className="w-4 h-4 mr-2" />
                      Subscribed
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Subscribe
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-secondary rounded-full">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleLike}
                  className="rounded-l-full rounded-r-none px-4"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  {formatCount(video.like_count)}
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleDislike}
                  className="rounded-r-full rounded-l-none px-4"
                >
                  <ThumbsDown className="w-4 h-4" />
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

          {/* Description */}
          <div className="bg-secondary rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{formatCount(video.views_count)} views</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.upload_time), { addSuffix: true })}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{video.description}</p>
          </div>

          <Separator />

          {/* Comments */}
          <CommentSection videoId={video.video_id} />
        </div>

        {/* Related videos sidebar */}
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
