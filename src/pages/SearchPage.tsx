import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Channel } from '@/lib/models';
import * as api from '@/lib/api';
import { Link } from 'react-router-dom';

export const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [videos, setVideos] = useState<(Video & { display_name?: string; profile_pic_path?: string })[]>([]);
  const [channels, setChannels] = useState<Partial<Channel>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (query) {
      search();
    }
  }, [query]);

  const search = async () => {
    setIsLoading(true);
    try {
      const [videoResults, channelResults] = await Promise.all([
        api.searchVideos(query, 0, 20),
        api.searchChannels(query, 0, 10),
      ]);

      // Get full video details
      const videosWithDetails = await Promise.all(
        videoResults.map(async (v) => {
          try {
            const detail = await api.getVideoDetail(v.video_id!, null);
            const ch = await api.getChannelDetail(detail.channel_id);
            return { ...detail, display_name: ch.display_name, profile_pic_path: ch.profile_pic_path };
          } catch {
            return null;
          }
        })
      );

      setVideos(videosWithDetails.filter((v): v is Video & { display_name: string; profile_pic_path: string } => v !== null));
      setChannels(channelResults);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">
          Search results for "{query}"
        </h1>

        <Tabs defaultValue="videos">
          <TabsList className="bg-secondary">
            <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
            <TabsTrigger value="channels">Channels ({channels.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-3">
                    <div className="aspect-video bg-muted rounded-xl" />
                    <div className="h-4 bg-muted rounded w-full" />
                  </div>
                ))}
              </div>
            ) : videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.video_id} video={video} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">
                No videos found for "{query}"
              </p>
            )}
          </TabsContent>

          <TabsContent value="channels" className="mt-6">
            {channels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {channels.map((ch) => (
                  <Link
                    key={ch.channel_id}
                    to={`/channel/${ch.channel_id}`}
                    className="flex items-center gap-4 p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={ch.profile_pic_path !== 'no' ? ch.profile_pic_path : undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {ch.display_name?.charAt(0).toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{ch.display_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {ch.subscriber_count || 0} subscribers
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">
                No channels found for "{query}"
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
