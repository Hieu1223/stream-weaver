import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { Video, LightWeightChannel, LightWeightVideo } from '@/lib/models';
import { Users, LogIn, Loader2, PlaySquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

const BASE_URL = "http://localhost:8000";

export const SubscriptionsPage = () => {
  const { channel, token, isAuthenticated } = useAuth();
  const [subscriptions, setSubscriptions] = useState<LightWeightChannel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to fix image paths (consistent with your api.ts logic)
  const fixImgPath = (path: string | undefined | null) => {
    if (path && path.includes('files/')) {
      return `${BASE_URL}/${path}.jpg`;
    }
    return path || undefined;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!channel?.channel_id || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Get the list of subscribed channels
        const subs = await api.listSubscriptions(channel.channel_id, token, 0, 50);
        setSubscriptions(subs);

        // 2. Fetch videos from each channel
        const allVideosEnriched: Video[] = [];
        
        // Using Promise.all for faster concurrent fetching
        await Promise.all(
          subs.map(async (sub) => {
            try {
              const channelVideos = await api.getChannelVideos(sub.channel_id, token);
              console.log(channelVideos)
              // Attach channel info to each video so VideoCard works correctly
              const enriched = channelVideos.map((v: LightWeightVideo) => ({
                ...v,
                thumbnail_path: fixImgPath(v.thumbnail_path),
                display_name: sub.display_name,
                profile_pic_path: fixImgPath(sub.profile_pic_path),
              })) as unknown as Video[];

              allVideosEnriched.push(...enriched);
            } catch (err) {
              console.error(`Failed to fetch videos for ${sub.display_name}`);
            }
          })
        );

        // 3. Sort by upload time (newest first)
        allVideosEnriched.sort((a, b) => 
          new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime()
        );

        setVideos(allVideosEnriched);
      } catch (error) {
        toast.error('Failed to load subscriptions');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, channel?.channel_id, token]);

  if (!isAuthenticated) {
    return (
      <Layout>
        <Helmet>
          <title>Subscriptions - VidStream</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="bg-primary/10 p-6 rounded-full mb-6">
            <Users className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Don't miss new videos</h1>
          <p className="text-muted-foreground mb-6 max-w-sm">Sign in to see updates from your favorite channels and never miss a beat.</p>
          <Button asChild className="rounded-full px-8">
            <Link to="/login">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>Subscriptions - VidStream</title>
      </Helmet>
      
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <PlaySquare className="w-8 h-8 text-primary" />
          Subscriptions
        </h1>
      </div>

      {/* Subscribed Channels Horizontal Bar */}
      {subscriptions.length > 0 && (
        <div className="mb-10 group">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Channels</h2>
            <Link to="/subscriptions/manage" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {subscriptions.map((sub) => (
              <Link
                key={sub.channel_id}
                to={`/channel/${sub.channel_id}`}
                className="flex flex-col items-center gap-2 min-w-[72px] transition-transform hover:scale-105"
              >
                <Avatar className="w-14 h-14 border-2 border-transparent group-hover:border-primary/20 transition-all">
                  <AvatarImage src={fixImgPath(sub.profile_pic_path)} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xl">
                    {sub.display_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-medium text-center line-clamp-1 w-full">
                  {sub.display_name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Videos Feed */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-video bg-muted animate-pulse rounded-xl" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-secondary/30 p-8 rounded-full mb-4">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">
            {subscriptions.length === 0 
              ? "Your subscription feed is empty" 
              : "No recent videos found"}
          </p>
          <p className="text-muted-foreground mb-6">
            {subscriptions.length === 0 
              ? "Subscribe to channels to see their latest videos here." 
              : "Try subscribing to more creators!"}
          </p>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">Browse Trending</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((video, idx) => (
            <VideoCard key={`${video.video_id}-${idx}`} video={video} />
          ))}
        </div>
      )}
    </Layout>
  );
};