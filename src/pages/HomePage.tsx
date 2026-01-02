import { useEffect, useState, useRef, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { Video } from '@/lib/models';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react'; // For the bottom spinner

export const HomePage = () => {
  const [videos, setVideos] = useState<(Video & { display_name?: string; profile_pic_path?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const { channel } = useAuth();
  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 12;

  // 1. Core function to fetch a specific page
  const fetchVideos = useCallback(async (pageNum: number) => {
    try {
      const accessibleIds = await api.getAccessibleVideos(channel?.channel_id || null, pageNum, PAGE_SIZE);
      
      if (accessibleIds.length < PAGE_SIZE) {
        setHasMore(false);
      }

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

      const filtered = videosWithDetails.filter((v): v is Video & { display_name: string; profile_pic_path: string } => v !== null);
      
      setVideos(prev => pageNum === 0 ? filtered : [...prev, ...filtered]);
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [channel?.channel_id]);

  // Initial Load
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setIsLoading(true);
    fetchVideos(0);
  }, [channel?.channel_id, fetchVideos]);

  // 2. Intersection Observer Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore && !isLoading) {
          setIsFetchingMore(true);
          setPage(prev => {
            const nextP = prev + 1;
            fetchVideos(nextP);
            return nextP;
          });
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, isLoading, fetchVideos]);

  return (
    <>
      <Helmet>
        <title>VidStream - Watch and Share Videos</title>
      </Helmet>
      
      <Layout>
        <div className="space-y-6 pb-10">
          <h1 className="text-2xl font-display font-bold">Recommended</h1>
          
          {isLoading && page === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : videos.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.video_id} video={video} />
                ))}
              </div>

              {/* 3. The Sentinel Element */}
              <div ref={observerTarget} className="h-20 flex items-center justify-center w-full">
                {isFetchingMore && (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
                {!hasMore && videos.length > 5 && (
                  <p className="text-sm text-muted-foreground italic">You've reached the end of the feed.</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No videos available yet.</p>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

// Extracted for cleanliness
const SkeletonCard = () => (
  <div className="animate-pulse space-y-3">
    <div className="aspect-video bg-muted rounded-xl" />
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    </div>
  </div>
);