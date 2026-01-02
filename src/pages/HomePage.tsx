import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { Video } from '@/lib/models';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { Helmet } from 'react-helmet-async';

export const HomePage = () => {
  const [videos, setVideos] = useState<(Video & { display_name?: string; profile_pic_path?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { channel } = useAuth();

  useEffect(() => {
    loadVideos();
  }, [channel]);

  const loadVideos = async () => {
    try {
      const accessibleIds = await api.getAccessibleVideos(channel?.channel_id || null, 0, 20);
      
      const videosWithDetails = await Promise.all(
        accessibleIds.map(async ({ video_id }) => {
          try {
            const videoDetail = await api.getVideoDetail(video_id, channel?.channel_id || null);
            const channelDetail = await api.getChannelDetail(videoDetail.channel_id);
            return {
              ...videoDetail,
              display_name: channelDetail.display_name,
              profile_pic_path: channelDetail.profile_pic_path,
            };
          } catch {
            return null;
          }
        })
      );

      setVideos(videosWithDetails.filter((v): v is Video & { display_name: string; profile_pic_path: string } => v !== null));
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>VidStream - Watch and Share Videos</title>
        <meta name="description" content="Discover, watch, and share amazing videos on VidStream. Your ultimate video streaming platform." />
      </Helmet>
      
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-display font-bold">Recommended</h1>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="aspect-video bg-muted rounded-xl" />
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
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
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No videos available yet.</p>
              <p className="text-muted-foreground">Be the first to upload!</p>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};
