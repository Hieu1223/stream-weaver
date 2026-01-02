import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { Video, LightWeightVideo } from '@/lib/models';
import { ThumbsUp, LogIn, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const LikedVideosPage = () => {
  const { channel, token, isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 12;

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialLikedVideos();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, channel?.channel_id]);

  // Helper to enrich lightweight videos with channel details if needed
  // or simply map them to the Video interface
  const enrichVideos = async (lightVideos: LightWeightVideo[]): Promise<Video[]> => {
    return Promise.all(
      lightVideos.map(async (v) => {
        try {
          // Fetch the channel detail to get the profile_pic and name for the VideoCard
          const channelInfo = await api.getChannelDetail(v.channel_id);
          return {
            ...v,
            display_name: channelInfo.display_name,
            profile_pic_path: channelInfo.profile_pic_path,
          } as unknown as Video;
        } catch {
          return v as unknown as Video;
        }
      })
    );
  };

  const loadInitialLikedVideos = async () => {
    if (!channel?.channel_id || !token) return;
    setLoading(true);
    try {
      const response = await api.getLikedVideos(channel.channel_id, token, 0, PAGE_SIZE);
      const enriched = await enrichVideos(response.videos);
      
      setVideos(enriched);
      setPage(0);
      setHasMore(enriched.length < response.total);
    } catch (error) {
      toast.error('Failed to load liked videos');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!channel?.channel_id || !token || loadingMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      const response = await api.getLikedVideos(channel.channel_id, token, nextPage, PAGE_SIZE);
      const enriched = await enrichVideos(response.videos);
      
      setVideos(prev => [...prev, ...enriched]);
      setPage(nextPage);
      setHasMore(videos.length + enriched.length < response.total);
    } catch (error) {
      toast.error('Failed to load more videos');
    } finally {
      setLoadingMore(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <Helmet>
          <title>Liked Videos - VidStream</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="bg-primary/10 p-6 rounded-full mb-6">
            <ThumbsUp className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Save your favorite videos</h1>
          <p className="text-muted-foreground mb-6 max-w-xs">Sign in to access your library and see videos you've liked</p>
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
        <title>Liked Videos - VidStream</title>
      </Helmet>
      
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ThumbsUp className="w-8 h-8 text-primary" />
          Liked Videos
        </h1>
        {!loading && videos.length > 0 && (
          <span className="text-sm text-muted-foreground font-medium bg-secondary px-3 py-1 rounded-full">
            {videos.length} videos
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-video bg-muted animate-pulse rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-secondary/20 rounded-3xl border-2 border-dashed border-muted">
          <ThumbsUp className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium text-lg">Your liked list is empty</p>
          <p className="text-sm text-muted-foreground mb-6">Videos you like will appear here</p>
          <Button variant="outline" asChild className="rounded-full">
            <Link to="/">Explore Home</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {videos.map((video, idx) => (
              <VideoCard key={`${video.video_id}-${idx}`} video={video} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pb-12">
              <Button 
                variant="secondary" 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                className="min-w-[180px] rounded-full shadow-sm hover:shadow-md transition-all"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Show more'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};