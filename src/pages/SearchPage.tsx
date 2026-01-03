import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VideoCard } from '@/components/video/VideoCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Channel } from '@/lib/models';
import * as api from '@/lib/api';

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

  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;

        if (activeTab === 'videos' && vHasMore && !vLoading) {
          setVPage(p => p + 1);
        }

        if (activeTab === 'channels' && cHasMore && !cLoading) {
          setCPage(p => p + 1);
        }
      });

      observer.current.observe(node);
    },
    [activeTab, vHasMore, cHasMore, vLoading, cLoading]
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

  /** Reset page when switching tabs */
  useEffect(() => {
    if (activeTab === 'videos' && videos.length === 0) setVPage(0);
    if (activeTab === 'channels' && channels.length === 0) setCPage(0);
  }, [activeTab]);

  /** Fetch Videos */
  useEffect(() => {
    if (!query || activeTab !== 'videos' || !vHasMore) return;

    const load = async () => {
      setVLoading(true);
      try {
        const results = await api.searchVideos(query, vPage * LIMIT, LIMIT);
        if (results.length < LIMIT) setVHasMore(false);

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

        setVideos(prev => [...prev, ...enriched.filter(Boolean)]);
      } finally {
        setVLoading(false);
      }
    };

    load();
  }, [query, vPage, activeTab]);

  /** Fetch Channels */
  useEffect(() => {
    if (!query || activeTab !== 'channels' || !cHasMore) return;

    const load = async () => {
      setCLoading(true);
      try {
        const results = await api.searchChannels(query, cPage * LIMIT, LIMIT);
        if (results.length < LIMIT) setCHasMore(false);
        setChannels(prev => [...prev, ...results]);
      } finally {
        setCLoading(false);
      }
    };

    load();
  }, [query, cPage, activeTab]);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Results for "{query}"</h1>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
            <TabsTrigger value="channels">Channels ({channels.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {videos.map((v, i) => (
                <div
                  key={v.video_id}
                  ref={i === videos.length - 1 ? lastElementRef : null}
                >
                  <VideoCard video={v} />
                </div>
              ))}
            </div>
            {vLoading && <div className="text-center py-10">Loading videos…</div>}
          </TabsContent>

          <TabsContent value="channels" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {channels.map((ch, i) => (
                <Link
                  key={ch.channel_id}
                  ref={i === channels.length - 1 ? lastElementRef : null}
                  to={`/channel/${ch.channel_id}`}
                  className="flex items-center gap-4 p-4 bg-secondary rounded-xl"
                >
                  <Avatar>
                    <AvatarImage src={ch.profile_pic_path} />
                    <AvatarFallback>{ch.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{ch.display_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ch.subscriber_count} subs
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {cLoading && <div className="text-center py-10">Loading channels…</div>}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
