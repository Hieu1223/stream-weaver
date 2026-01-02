import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Edit2, Upload, Users, Calendar, Settings } from 'lucide-react';
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

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
};

export const ChannelPage = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const [channelData, setChannelData] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { channel, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isOwner = channel?.channel_id === channelId;

  useEffect(() => {
    if (channelId) {
      loadChannel();
    }
  }, [channelId, token]);

  const loadChannel = async () => {
    if (!channelId) return;
    setIsLoading(true);

    try {
      const data = await api.getChannelDetail(channelId);
      setChannelData(data);

      const channelVideos = await api.getChannelVideos(
        channelId,
        isOwner ? token : null
      );
      
      const videosWithChannel = channelVideos.map(v => ({
        ...v,
        display_name: data.display_name,
        profile_pic_path: data.profile_pic_path,
      }));
      
      setVideos(videosWithChannel);
    } catch (err) {
      toast.error('Failed to load channel');
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-muted rounded-xl" />
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-48" />
              <div className="h-4 bg-muted rounded w-32" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!channelData) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Channel not found</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Banner */}
        <div className="h-48 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-secondary" />

        {/* Channel info */}
        <div className="flex flex-wrap items-start gap-6">
          <Avatar className="w-24 h-24 -mt-12 ring-4 ring-background">
            <AvatarImage 
              src={channelData.profile_pic_path !== 'no' ? channelData.profile_pic_path : undefined} 
            />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {channelData.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold">{channelData.display_name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {formatCount(channelData.subscriber_count)} subscribers
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {formatDistanceToNow(new Date(channelData.created_at), { addSuffix: true })}
              </span>
            </div>
            {channelData.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">{channelData.description}</p>
            )}
          </div>

          <div className="flex gap-2">
            {isOwner ? (
              <>
                <Button variant="secondary" onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button onClick={() => navigate('/upload')} className="glow">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSubscribe}
                variant={isSubscribed ? 'secondary' : 'default'}
                className={!isSubscribed ? 'glow' : ''}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="videos" className="mt-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.video_id} video={video} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No videos uploaded yet</p>
                {isOwner && (
                  <Button onClick={() => navigate('/upload')} className="mt-4">
                    Upload your first video
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-lg font-semibold">About {channelData.display_name}</h2>
              <p className="text-muted-foreground">
                {channelData.description || 'No description provided.'}
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Subscribers:</strong> {formatCount(channelData.subscriber_count)}
                </p>
                <p>
                  <strong>Videos:</strong> {videos.length}
                </p>
                <p>
                  <strong>Joined:</strong> {new Date(channelData.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
