import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { Video, LightWeightChannel, LightWeightVideo } from '@/lib/models';
import { Users, LogIn, PlaySquare } from 'lucide-react';
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

  // Improved helper: Don't break YouTube links, only fix local paths
  const fixImgPath = (path: string | undefined | null) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path; // Already a full URL (YouTube)
    if (path.includes('files/')) return `${BASE_URL}/${path}.jpg`;
    return path;
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

        // 2. Fetch videos from each channel concurrently
        const results = await Promise.all(
          subs.map(async (sub) => {
            try {
              const channelVideos = await api.getChannelVideos(sub.channel_id, token);
              
              // Map channel info onto each video
              return channelVideos.map((v: LightWeightVideo) => ({
                ...v,
                thumbnail_path: fixImgPath(v.thumbnail_path),
                display_name: sub.display_name,
                profile_pic_path: fixImgPath(sub.profile_pic_path),
                // Ensure upload_time is a date object for sorting
                upload_time: v.upload_time
              }));
            } catch (err) {
              console.error(`Failed to fetch videos for ${sub.display_name}`);
              return [];
            }
          })
        );

        // 3. Flatten the array of arrays and INTERLEAVE by sorting by date
        const interleavedVideos = results
          .flat()
          .sort((a, b) => {
            const dateA = new Date(a.upload_time || 0).getTime();
            const dateB = new Date(b.upload_time || 0).getTime();
            return dateB - dateA; // Newest first
          });

        setVideos(interleavedVideos as unknown as Video[]);
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
        <Helmet><title>Subscriptions - VidStream</title></Helmet>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="bg-primary/10 p-6 rounded-full mb-6">
            <Users className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Don't miss new videos</h1>
          <p className="text-muted-foreground mb-6 max-w-sm">Sign in to see updates from your favorite channels.</p>
          <Button asChild className="rounded-full px-8">
            <Link to="/login"><LogIn className="w-4 h-4 mr-2" /> Sign In</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet><title>Subscriptions - VidStream</title></Helmet>
      
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <PlaySquare className="w-8 h-8 text-primary" />
          Subscriptions
        </h1>
      </div>

      {/* Subscribed Channels Bar */}
      {subscriptions.length > 0 && (
        <div className="mb-10 group">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Channels</h2>
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
                <span className="text-[11px] font-medium text-center line-clamp-1 w-full">{sub.display_name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Interleaved Videos Feed */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-video bg-muted animate-pulse rounded-xl" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium">Your subscription feed is empty</p>
          <Button asChild variant="outline" className="mt-4 rounded-full">
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