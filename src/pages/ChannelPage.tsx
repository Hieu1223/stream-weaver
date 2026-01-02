import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Users, Calendar, Settings, Loader2 } from 'lucide-react';
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
      // 1. Fetch channel details (path conversion is handled inside api.ts)
      const data = await api.getChannelDetail(channelId);
      setChannelData(data);

      // 2. Fetch channel videos
      const channelVideos = await api.getChannelVideos(
        channelId,
        isOwner ? token : null
      );
      
      // 3. Map lightweight videos to full video interface for VideoCard
      const videosWithChannel = channelVideos.map(v => ({
        ...v,
        // Ensure thumbnail paths are corrected if not already handled in api
        thumbnail_path: v.thumbnail_path,
        // Inject channel data for the VideoCard display
        channel_id: data.channel_id,
        display_name: data.display_name,
        profile_pic_path: data.profile_pic_path,
      })) as unknown as Video[]; 
      
      setVideos(videosWithChannel);

      // 4. Check subscription status if user is logged in
      if (isAuthenticated && channel && !isOwner) {
        const subs = await api.listSubscriptions(channel.channel_id, token || '', 0, 100);
        const following = subs.some(s => s.channel_id === channelId);
        setIsSubscribed(following);
      }
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
        setChannelData(prev => prev ? { ...prev, subscriber_count: prev.subscriber_count - 1 } : null);
        toast.success('Unsubscribed');
      } else {
        await api.subscribe(channelData.channel_id, channel.channel_id, token);
        setIsSubscribed(true);
        setChannelData(prev => prev ? { ...prev, subscriber_count: prev.subscriber_count + 1 } : null);
        toast.success('Subscribed!');
      }
    } catch (err) {
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
        {/* Banner */}
        <div className="h-32 md:h-48 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />

        {/* Channel info */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 px-2">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 -mt-12 md:-mt-16 border-4 border-background shadow-xl">
            <AvatarImage src={channelData.profile_pic_path} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {channelData.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold truncate">{channelData.display_name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">
                {formatCount(channelData.subscriber_count)} subscribers
              </span>
              <span>•</span>
              <span>{videos.length} videos</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Joined {formatDistanceToNow(new Date(channelData.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
            {isOwner ? (
              <>
                <Button variant="outline" className="flex-1 md:flex-none" onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button onClick={() => navigate('/upload')} className="flex-1 md:flex-none">
                  <Upload className="w-4 h-4 mr-2" />
                  Manage Videos
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSubscribe}
                variant={isSubscribed ? 'secondary' : 'default'}
                className={cn("flex-1 md:flex-none rounded-full px-8 font-bold", !isSubscribed && "bg-foreground text-background hover:bg-foreground/90")}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none p-0 gap-6">
            <TabsTrigger value="videos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3">Videos</TabsTrigger>
            <TabsTrigger value="about" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3">About</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="pt-6">
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {videos.map((video) => (
                  <VideoCard key={video.video_id} video={video} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-muted-foreground mb-4">This channel hasn't uploaded any videos yet.</p>
                {isOwner && (
                  <Button onClick={() => navigate('/upload')}>
                    Upload Video
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="pt-6">
            <div className="max-w-3xl space-y-8">
              <section>
                <h3 className="text-lg font-bold mb-3">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {channelData.description || "No description provided."}
                </p>
              </section>
              
              <section className="pt-6 border-t">
                <h3 className="text-lg font-bold mb-3">Stats</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="p-4 rounded-lg bg-secondary/30">
                      <p className="text-2xl font-bold">{formatCount(channelData.subscriber_count)}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Subscribers</p>
                   </div>
                   <div className="p-4 rounded-lg bg-secondary/30">
                      <p className="text-2xl font-bold">{videos.length}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Videos</p>
                   </div>
                   <div className="p-4 rounded-lg bg-secondary/30">
                      <p className="text-2xl font-bold">{new Date(channelData.created_at).getFullYear()}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Year Joined</p>
                   </div>
                </div>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};