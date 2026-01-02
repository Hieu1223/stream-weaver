import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api'; // Use all api functions
import { Video } from '@/lib/models';
import { ThumbsUp, LogIn, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const LikedVideosPage = () => {
  const { channel, token, isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialLikedVideos();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, channel?.channel_id]);

  const loadInitialLikedVideos = async () => {
    if (!channel?.channel_id || !token) return;
    setLoading(true);
    try {
      const response = await api.getLikedVideos(channel.channel_id, token, 0, 12);
      setVideos(response.videos);
      setPage(0);
      setHasMore(response.videos.length < response.total);
    } catch (error) {
      console.error('Failed to fetch liked videos:', error);
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
      const response = await api.getLikedVideos(channel.channel_id, token, nextPage, 12);
      setVideos(prev => [...prev, ...response.videos]);
      setPage(nextPage);
      setHasMore(videos.length + response.videos.length < response.total);
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <ThumbsUp className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Save your favorite videos</h1>
          <p className="text-muted-foreground mb-6">Sign in to see videos you've liked</p>
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
        <title>Liked Videos - VidStream</title>
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ThumbsUp className="w-8 h-8 text-primary" />
          Liked Videos
        </h1>
      </div>

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
        <div className="flex flex-col items-center justify-center py-20 bg-secondary/10 rounded-2xl border-2 border-dashed">
          <ThumbsUp className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground font-medium">No liked videos yet</p>
          <Button variant="link" asChild>
            <Link to="/">Go explore videos</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.video_id} video={video} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pb-10">
              <Button 
                variant="outline" 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                className="min-w-[200px] rounded-full"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};