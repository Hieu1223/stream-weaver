import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { useAuth } from '@/contexts/AuthContext';
import { getWatchHistory, getVideoDetail, getReaction } from '@/lib/api';
import { Video, WatchProgress } from '@/lib/models';
import { ThumbsUp, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const LikedVideosPage = () => {
  const { channel, token, isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLikedVideos = async () => {
      if (!channel?.channel_id || !token) {
        setLoading(false);
        return;
      }

      try {
        // Get history to find videos user has interacted with
        const history = await getWatchHistory(channel.channel_id, token);
        
        // Check reaction for each video
        const likedVideos: Video[] = [];
        for (const item of history as WatchProgress[]) {
          try {
            const reaction = await getReaction(channel.channel_id, 'video', item.video_id);
            if (reaction.reaction === 'like') {
              const video = await getVideoDetail(item.video_id, channel.channel_id);
              likedVideos.push(video);
            }
          } catch {
            // Video may not exist anymore
          }
        }
        setVideos(likedVideos);
      } catch (error) {
        console.error('Failed to fetch liked videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedVideos();
  }, [channel, token]);

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
          <ThumbsUp className="w-8 h-8" />
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
        <div className="text-center py-12">
          <ThumbsUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No liked videos yet</p>
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
