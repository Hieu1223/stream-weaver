import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { useAuth } from '@/contexts/AuthContext';
import { listSubscriptions, getChannelVideos } from '@/lib/api';
import { Video, Channel } from '@/lib/models';
import { Users, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const BASE_URL = "http://localhost:8000";

export const SubscriptionsPage = () => {
  const { channel, token, isAuthenticated } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!channel?.channel_id || !token) {
        setLoading(false);
        return;
      }

      try {
        const subs = await listSubscriptions(channel.channel_id, token);
        setSubscriptions(subs);

        // Fetch videos from subscribed channels
        const allVideos: Video[] = [];
        for (const sub of subs) {
          try {
            const channelVideos = await getChannelVideos(sub.channel_id, null);
            allVideos.push(...channelVideos);
          } catch {
            // Channel may have no videos
          }
        }

        // Sort by upload time, newest first
        allVideos.sort((a, b) => 
          new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime()
        );
        setVideos(allVideos);
      } catch (error) {
        console.error('Failed to fetch subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [channel, token]);

  if (!isAuthenticated) {
    return (
      <Layout>
        <Helmet>
          <title>Subscriptions - VidStream</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Don't miss new videos</h1>
          <p className="text-muted-foreground mb-6">Sign in to see updates from your favorite channels</p>
          <Button asChild>
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
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8" />
          Subscriptions
        </h1>
      </div>

      {/* Subscribed Channels */}
      {subscriptions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Subscribed Channels</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {subscriptions.map((sub) => (
              <Link
                key={sub.channel_id}
                to={`/channel/${sub.channel_id}`}
                className="flex flex-col items-center gap-2 min-w-[80px] hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-16 h-16">
                  <AvatarImage 
                    src={sub.profile_pic_path && sub.profile_pic_path !== 'no' 
                      ? `${BASE_URL}/${sub.profile_pic_path}` 
                      : undefined} 
                  />
                  <AvatarFallback>{sub.display_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-center line-clamp-2">{sub.display_name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Videos from Subscriptions */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-muted rounded-xl mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {subscriptions.length === 0 
              ? "You haven't subscribed to any channels yet" 
              : "No videos from your subscriptions"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.video_id} video={video} />
          ))}
        </div>
      )}
    </Layout>
  );
};
