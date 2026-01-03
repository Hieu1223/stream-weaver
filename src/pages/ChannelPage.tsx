import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Settings, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Channel } from '@/lib/models';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
};

export const ChannelPage = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { channel, token, isAuthenticated } = useAuth();

  // Data State
  const [channelData, setChannelData] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  
  // Status State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const isOwner = channel?.channel_id === channelId;

  /**
   * 1. LOAD INITIAL DATA
   * Resets everything and fetches Channel + Page 0
   */
  const initChannel = useCallback(async () => {
    if (!channelId) return;
    setIsLoading(true);
    setPage(0);
    setHasMore(true);

    try {
      const [data, initialVideos] = await Promise.all([
        api.getChannelDetail(channelId),
        api.getChannelVideos(channelId, 0, PAGE_SIZE, isOwner ? token : null)
      ]);

      setChannelData(data);
      
      const processed = initialVideos.map(v => ({
        ...v,
        channel_id: data.channel_id,
        display_name: data.display_name,
        profile_pic_path: data.profile_pic_path,
      })) as unknown as Video[];

      setVideos(processed);
      if (processed.length < PAGE_SIZE) setHasMore(false);

      if (isAuthenticated && channel && !isOwner) {
        const status = await api.checkSubscriptionStatus(channel.channel_id, channelId);
        setIsSubscribed(status.is_subscribed);
      }
    } catch (err) {
      toast.error('Failed to load channel');
    } finally {
      setIsLoading(false);
    }
  }, [channelId, isOwner, token, isAuthenticated, channel]);

  useEffect(() => {
    initChannel();
  }, [initChannel]);

  /**
   * 2. FETCH MORE VIDEOS (INFINITE SCROLL)
   * Prevents duplicates by checking existing IDs
   */
  const fetchMoreVideos = async (targetPage: number) => {
    if (!channelId || isFetchingMore || !hasMore || !channelData) return;
    setIsFetchingMore(true);

    try {
      const moreVideos = await api.getChannelVideos(
        channelId,
        targetPage,
        PAGE_SIZE,
        isOwner ? token : null
      );

      if (moreVideos.length === 0) {
        setHasMore(false);
        return;
      }

      const processed = moreVideos.map(v => ({
        ...v,
        channel_id: channelData.channel_id,
        display_name: channelData.display_name,
        profile_pic_path: channelData.profile_pic_path,
      })) as unknown as Video[];

      setVideos(prev => {
        const existingIds = new Set(prev.map(v => v.video_id));
        const uniqueNewVideos = processed.filter(v => !existingIds.has(v.video_id));
        return [...prev, ...uniqueNewVideos];
      });

      if (processed.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.error("Pagination error:", err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  /**
   * 3. INTERSECTION OBSERVER
   */
  const observer = useRef<IntersectionObserver | null>(null);
  const lastVideoElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMoreVideos(nextPage);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingMore, hasMore, page]);

  const handleSubscribe = async () => {
    if (!channelData || !channel || !token) {
      toast.error('Please sign in to subscribe');
      return;
    }
    try {
      if (isSubscribed) {
        await api.unsubscribe(channelData.channel_id, channel.channel_id, token);
        setIsSubscribed(false);
        setChannelData(prev => prev ? { ...prev, subscriber_count: prev.subscriber_count - 1 } : null);
      } else {
        await api.subscribe(channelData.channel_id, channel.channel_id, token);
        setIsSubscribed(true);
        setChannelData(prev => prev ? { ...prev, subscriber_count: prev.subscriber_count + 1 } : null);
      }
    } catch {
      toast.error('Action failed');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!channelData) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Channel not found</h1>
          <Button variant="link" onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Banner Area */}
        <div className="h-32 md:h-48 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 border border-white/5" />

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 px-2">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 -mt-12 md:-mt-16 border-4 border-background shadow-xl">
            <AvatarImage src={channelData.profile_pic_path} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {channelData.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold truncate">{channelData.display_name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">
                {formatCount(channelData.subscriber_count)} subscribers
              </span>
              <span>•</span>
              <span>Joined {new Date(channelData.created_at).getFullYear()}</span>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
            {isOwner ? (
              <>
                <Button variant="outline" onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
                <Button onClick={() => navigate('/upload')}>
                  <Upload className="w-4 h-4 mr-2" /> Manage
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSubscribe}
                variant={isSubscribed ? 'secondary' : 'default'}
                className={cn("rounded-full px-8 font-bold", !isSubscribed && "bg-white text-black hover:bg-zinc-200")}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none p-0 gap-6">
            <TabsTrigger value="videos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-2 pb-3">Videos</TabsTrigger>
            <TabsTrigger value="about" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-2 pb-3">About</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="pt-6">
            {videos.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                  {videos.map((video, index) => {
                    // Attach the observer to the very last element
                    const isLast = videos.length === index + 1;
                    return (
                      <div ref={isLast ? lastVideoElementRef : null} key={`${video.video_id}-${index}`}>
                        <VideoCard video={video} />
                      </div>
                    );
                  })}
                </div>
                {isFetchingMore && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-muted-foreground">No videos found.</p>
                {isOwner && <Button className="mt-4" onClick={() => navigate('/upload')}>Upload your first video</Button>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="pt-6">
            <div className="max-w-2xl space-y-8">
              <section>
                <h3 className="text-lg font-bold mb-3">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {channelData.description || "No description provided."}
                </p>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};