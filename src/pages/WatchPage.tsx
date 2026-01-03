import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Bell,
  BellOff,
  ListPlus,
  Loader2,
  Plus,
  Check
} from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { VideoCard } from "@/components/video/VideoCard";
import { CommentSection } from "@/components/video/CommentSection";
import { PlaylistSidebar } from "@/components/video/PlaylistSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Video, Channel, ReactionType, Playlist } from "@/lib/models";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import * as api from "@/lib/api";
import { toast } from "sonner";

type PlaylistWithStatus = Playlist & {
  has_video: boolean;
};

const formatCount = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
};

export const WatchPage = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const playlistId = searchParams.get("playlist");

  const { channel, token, isAuthenticated } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [channelData, setChannelData] = useState<Channel | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userReaction, setUserReaction] = useState<ReactionType>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(!!playlistId);

  // Save modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<PlaylistWithStatus[]>([]);

  /* ----------------------------- LOAD VIDEO ----------------------------- */

  const loadVideoData = useCallback(async () => {
    if (!videoId) return;

    setIsLoading(true);
    try {
      const videoData = await api.getVideoDetail(
        videoId,
        channel?.channel_id ?? null
      );
      setVideo(videoData);
      api.viewVideo(videoId).catch(() => { });

      const ch = await api.getChannelDetail(videoData.channel_id);
      setChannelData(ch);

      if (channel && token) {
        const sub = await api.checkSubscriptionStatus(
          channel.channel_id,
          videoData.channel_id
        );
        setIsSubscribed(sub.is_subscribed);

        const reaction = await api.getReaction(
          channel.channel_id,
          "video",
          videoId
        );
        setUserReaction(reaction.reaction);
      }

      const accessible = await api.getAccessibleVideos(
        channel?.channel_id ?? null,
        0,
        10
      );

      const related = await Promise.all(
        accessible
          .filter(v => v.video_id !== videoId)
          .slice(0, 8)
          .map(v =>
            api.getVideoDetail(v.video_id, channel?.channel_id ?? null)
          )
      );

      setRelatedVideos(related);
    } catch {
      toast.error("Failed to load video");
    } finally {
      setIsLoading(false);
    }
  }, [videoId, channel, token]);

  useEffect(() => {
    loadVideoData();
    setShowPlaylist(!!playlistId);
  }, [loadVideoData, playlistId]);

  /* ----------------------------- SAVE MODAL ------------------------------ */

  const handleProgressUpdate = async (seconds: number) => {
    if (isAuthenticated && channel && token && videoId) {
      try {
        await api.updateWatchHistory(
          channel.channel_id,
          videoId,
          Math.floor(seconds),
          token
        );
      } catch {
        console.error('History sync failed');
      }
    }
  };

  const handleOpenSaveModal = async () => {
    if (!channel || !videoId) return;

    setIsSaveModalOpen(true);
    setIsLoadingPlaylists(true);

    try {
      const [allPlaylists, videoPlaylists] = await Promise.all([
        api.getChannelPlaylists(channel.channel_id, 0, 50),
        api.getPlaylistsFromVideo(videoId, channel.channel_id),
      ]);

      const videoPlaylistIds = new Set(
        videoPlaylists.map(pl => pl.playlist_id)
      );

      const merged: PlaylistWithStatus[] = allPlaylists.map(pl => ({
        ...pl,
        has_video: videoPlaylistIds.has(pl.playlist_id),
      }));

      setUserPlaylists(merged);
    } catch {
      toast.error("Failed to load playlists");
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleTogglePlaylist = async (pl: PlaylistWithStatus) => {
    if (!token || !videoId) return;

    try {
      if (pl.has_video) {
        await api.removeVideoFromPlaylist(pl.playlist_id, videoId, token);
      } else {
        await api.addVideoToPlaylist(pl.playlist_id, videoId, token);
      }

      setUserPlaylists(prev =>
        prev.map(p =>
          p.playlist_id === pl.playlist_id
            ? { ...p, has_video: !p.has_video }
            : p
        )
      );
    } catch {
      toast.error("Playlist update failed");
    }
  };

  /* ----------------------------- ACTIONS -------------------------------- */

  const handleReaction = async (type: "like" | "dislike") => {
    if (!channel || !token || !videoId) {
      toast.error("Sign in to react");
      return;
    }

    const next: ReactionType = userReaction === type ? "none" : type;
    await api.setReaction(
      channel.channel_id,
      token,
      "video",
      videoId,
      next
    );
    setUserReaction(next);
  };

  const handleSubscribe = async () => {
    if (!channel || !channelData || !token) return;

    if (isSubscribed) {
      await api.unsubscribe(channelData.channel_id, channel.channel_id, token);
      setIsSubscribed(false);
    } else {
      await api.subscribe(channelData.channel_id, channel.channel_id, token);
      setIsSubscribed(true);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  };

  /* ----------------------------- RENDER --------------------------------- */

  if (isLoading || !video) return null;
  handleProgressUpdate(0);
  return (
    <Layout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* MAIN */}
        <div className="xl:col-span-2 space-y-4">
          <VideoPlayer videoPath={video.video_path} />

          <h1 className="text-2xl font-bold">{video.title}</h1>

          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <Link to={`/channel/${channelData?.channel_id}`}>
                <Avatar>
                  <AvatarImage src={channelData?.profile_pic_path} />
                  <AvatarFallback>
                    {channelData?.display_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div>
                <Link
                  to={`/channel/${channelData?.channel_id}`}
                  className="font-bold"
                >
                  {channelData?.display_name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {formatCount(channelData?.subscriber_count ?? 0)} subscribers
                </div>
              </div>

              {channel?.channel_id !== channelData?.channel_id && (
                <Button size="sm" onClick={handleSubscribe}>
                  {isSubscribed ? <BellOff /> : <Bell />}
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex items-center bg-secondary rounded-full h-9">
                <button
                  onClick={() => handleReaction('like')}
                  className={cn(
                    "flex items-center gap-2 px-4 h-full rounded-l-full border-r border-background/20",
                    userReaction === 'like' && "text-primary"
                  )}
                >
                  <ThumbsUp
                    className={cn(
                      "w-4 h-4",
                      userReaction === 'like' && "fill-current"
                    )}
                  />
                  <span className="text-sm font-medium">
                    {formatCount(video.like_count)}
                  </span>
                </button>

                <button
                  onClick={() => handleReaction('dislike')}
                  className={cn(
                    "flex items-center px-4 h-full rounded-r-full",
                    userReaction === 'dislike' && "text-destructive"
                  )}
                >
                  <ThumbsDown
                    className={cn(
                      "w-4 h-4",
                      userReaction === 'dislike' && "fill-current"
                    )}
                  />
                </button>
              </div>

              <Button variant="secondary" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>

              <Button
                variant="secondary"
                disabled={!channel}
                onClick={handleOpenSaveModal}
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          <Separator />

          <CommentSection videoId={video.video_id} />
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          {showPlaylist && playlistId && (
            <PlaylistSidebar
              playlistId={playlistId}
              currentVideoId={video.video_id}
              onClose={() => {
                searchParams.delete("playlist");
                setSearchParams(searchParams);
              }}
            />
          )}

          <h3 className="font-bold">Up next</h3>
          {relatedVideos.map(v => (
            <VideoCard key={v.video_id} video={v} />
          ))}
        </div>
      </div>

      {/* SAVE MODAL */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex gap-2">
              <ListPlus />
              Save to playlist
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {isLoadingPlaylists ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              userPlaylists.map(pl => (
                <button
                  key={pl.playlist_id}
                  onClick={() => handleTogglePlaylist(pl)}
                  className="flex justify-between w-full p-3 rounded hover:bg-accent"
                >
                  <span>{pl.playlist_name}</span>
                  {pl.has_video ? <Check /> : <Plus />}
                </button>
              ))
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};
