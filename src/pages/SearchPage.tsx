import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Channel } from '@/lib/models';
import * as api from '@/lib/api';
import { formatCount, formatRelativeTime } from '@/lib/utils';

const LIMIT = 12;

export const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<'videos' | 'channels'>('videos');

  const [videos, setVideos] = useState<(Video & {
    display_name?: string;
    profile_pic_path?: string;
  })[]>([]);
  const [vPage, setVPage] = useState(0);
  const [vHasMore, setVHasMore] = useState(true);
  const [vLoading, setVLoading] = useState(false);

  const [channels, setChannels] = useState<Partial<Channel>[]>([]);
  const [cPage, setCPage] = useState(0);
  const [cHasMore, setCHasMore] = useState(true);
  const [cLoading, setCLoading] = useState(false);

  const videoObserver = useRef<IntersectionObserver | null>(null);
  const channelObserver = useRef<IntersectionObserver | null>(null);

  const lastVideoRef = useCallback(
    (node: HTMLElement | null) => {
      if (vLoading) return;
      if (videoObserver.current) videoObserver.current.disconnect();

      videoObserver.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && vHasMore) {
          setVPage(p => p + 1);
        }
      });

      if (node) videoObserver.current.observe(node);
    },
    [vLoading, vHasMore]
  );

  const lastChannelRef = useCallback(
    (node: HTMLElement | null) => {
      if (cLoading) return;
      if (channelObserver.current) channelObserver.current.disconnect();

      channelObserver.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && cHasMore) {
          setCPage(p => p + 1);
        }
      });

      if (node) channelObserver.current.observe(node);
    },
    [cLoading, cHasMore]
  );

  /** Reset on query change */
  useEffect(() => {
    setVideos([]);
    setChannels([]);
    setVPage(0);
    setCPage(0);
    setVHasMore(true);
    setCHasMore(true);
  }, [query]);

  /** Fetch Videos */
  useEffect(() => {
    if (!query || activeTab !== 'videos') return;
    if (vPage === 0 && videos.length > 0) return; // prevent refetch on tab switch

    const load = async () => {
      setVLoading(true);
      try {
        const results = await api.searchVideos(query, vPage * LIMIT, LIMIT);
        if (results.length < LIMIT) setVHasMore(false);
        if (results.length === 0) {
          setVLoading(false);
          return;
        }

        const enriched = await Promise.all(
          results.map(async v => {
            try {
              const detail = await api.getVideoDetail(v.video_id!, null);
              const ch = await api.getChannelDetail(detail.channel_id);
              return {
                ...detail,
                display_name: ch.display_name,
                profile_pic_path: ch.profile_pic_path,
              };
            } catch {
              return null;
            }
          })
        );

        const valid = enriched.filter(Boolean) as (Video & { display_name?: string; profile_pic_path?: string })[];
        setVideos(prev => vPage === 0 ? valid : [...prev, ...valid]);
      } finally {
        setVLoading(false);
      }
    };

    load();
  }, [query, vPage, activeTab]);

  /** Fetch Channels */
  useEffect(() => {
    if (!query || activeTab !== 'channels') return;
    if (cPage === 0 && channels.length > 0) return;

    const load = async () => {
      setCLoading(true);
      try {
        const results = await api.searchChannels(query, cPage * LIMIT, LIMIT);
        if (results.length < LIMIT) setCHasMore(false);
        setChannels(prev => cPage === 0 ? results : [...prev, ...results]);
      } finally {
        setCLoading(false);
      }
    };

    load();
  }, [query, cPage, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'videos' | 'channels');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Results for "{query}"</h1>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            {videos.length === 0 && !vLoading && (
              <p className="text-muted-foreground text-center py-10">No videos found</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {videos.map((v, i) => (
                <div
                  key={`${v.video_id}-${i}`}
                  ref={i === videos.length - 1 ? lastVideoRef : null}
                >
                  <VideoCard video={v} />
                </div>
              ))}
            </div>
            {vLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="channels" className="mt-6">
            {channels.length === 0 && !cLoading && (
              <p className="text-muted-foreground text-center py-10">No channels found</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {channels.map((ch, i) => (
                <Link
                  key={`${ch.channel_id}-${i}`}
                  ref={i === channels.length - 1 ? lastChannelRef : null}
                  to={`/channel/${ch.channel_id}`}
                  className="flex items-center gap-4 p-4 bg-secondary rounded-xl hover:bg-accent transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={ch.profile_pic_path} />
                    <AvatarFallback>{ch.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{ch.display_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatCount(ch.subscriber_count ?? 0)} subscribers
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {cLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
