import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ListVideo,
  Plus,
  Trash2,
  LogIn,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VideoCard } from '@/components/video/VideoCard';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import {
  createPlaylist,
  deletePlaylist,
  getPlaylistVideos,
  getChannelPlaylists,
  removeVideoFromPlaylist,
} from '@/lib/api';

import { Playlist, Video } from '@/lib/models';

export const PlaylistsPage = () => {
  const { channel, token, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<Record<string, Partial<Video>[]>>({});
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  /* ---------------- Fetch playlists ---------------- */

  const fetchPlaylists = useCallback(async () => {
    if (!channel?.channel_id) return;

    try {
      setLoading(true);
      const data = await getChannelPlaylists(channel.channel_id, 0, 50);
      setPlaylists(data as Playlist[]);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading playlists', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [channel?.channel_id, toast]);

  useEffect(() => {
    if (isAuthenticated) fetchPlaylists();
  }, [isAuthenticated, fetchPlaylists]);

  /* ---------------- Create playlist ---------------- */

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !channel?.channel_id || !token) return;

    try {
      setCreating(true);
      await createPlaylist(channel.channel_id, newPlaylistName, token);
      setNewPlaylistName('');
      toast({ title: 'Playlist created' });
      await fetchPlaylists();
    } catch {
      toast({ title: 'Failed to create playlist', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  /* ---------------- Delete playlist ---------------- */

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!token) return;

    try {
      await deletePlaylist(playlistId, token);
      setPlaylists(prev => prev.filter(p => p.playlist_id !== playlistId));
      setExpandedPlaylist(prev => (prev === playlistId ? null : prev));
      toast({ title: 'Playlist deleted' });
    } catch {
      toast({ title: 'Failed to delete playlist', variant: 'destructive' });
    }
  };

  /* ---------------- Toggle playlist ---------------- */

  const togglePlaylist = async (playlistId: string) => {
    if (expandedPlaylist === playlistId) {
      setExpandedPlaylist(null);
      return;
    }

    setExpandedPlaylist(playlistId);

    if (!playlistVideos[playlistId]) {
      try {
        const videos = await getPlaylistVideos(playlistId);
        setPlaylistVideos(prev => ({ ...prev, [playlistId]: videos }));
      } catch {
        toast({ title: 'Could not load videos', variant: 'destructive' });
      }
    }
  };

  /* ---------------- Remove video ---------------- */

  const handleRemoveVideo = async (playlistId: string, videoId: string) => {
    if (!token) return;

    try {
      await removeVideoFromPlaylist(playlistId, videoId, token);

      setPlaylistVideos(prev => ({
        ...prev,
        [playlistId]: prev[playlistId].filter(v => v.video_id !== videoId),
      }));

      toast({ title: 'Video removed from playlist' });
    } catch {
      toast({ title: 'Failed to remove video', variant: 'destructive' });
    }
  };

  /* ---------------- Not authenticated ---------------- */

  if (!isAuthenticated) {
    return (
      <Layout>
        <Helmet>
          <title>Playlists - VidStream</title>
        </Helmet>

        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <ListVideo className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Create and manage playlists</h1>
          <p className="text-muted-foreground mb-6">Sign in to create playlists</p>
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

  /* ---------------- Main UI ---------------- */

  return (
    <Layout>
      <Helmet>
        <title>Playlists - VidStream</title>
      </Helmet>

      <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
        <ListVideo className="w-8 h-8" />
        My Playlists
      </h1>

      {/* Create playlist */}
      <div className="flex gap-3 mb-8">
        <Input
          placeholder="New playlist name..."
          value={newPlaylistName}
          onChange={e => setNewPlaylistName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
          className="max-w-sm"
        />
        <Button onClick={handleCreatePlaylist} disabled={creating || !newPlaylistName.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          {creating ? 'Creating...' : 'Create'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <ListVideo className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No playlists yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {playlists.map(playlist => (
            <div key={playlist.playlist_id} className="border rounded-lg overflow-hidden">
              {/* Header */}
              <div
                className="flex justify-between items-center p-4 bg-card cursor-pointer"
                onClick={() => togglePlaylist(playlist.playlist_id)}
              >
                <span className="font-semibold">{playlist.playlist_name}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={e => {
                      e.stopPropagation();
                      if (window.confirm('Delete this playlist?')) {
                        handleDeletePlaylist(playlist.playlist_id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {expandedPlaylist === playlist.playlist_id ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {/* Videos */}
              {expandedPlaylist === playlist.playlist_id && (
                <div className="p-4 border-t">
                  {playlistVideos[playlist.playlist_id]?.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {playlistVideos[playlist.playlist_id].map(video => (
                        <div key={video.video_id} className="relative group">
                          <Link
                            to={`/watch/${video.video_id}?playlist=${playlist.playlist_id}`}
                          >
                            <VideoCard video={video as Video} />
                          </Link>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveVideo(
                                playlist.playlist_id,
                                video.video_id!
                              );
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-6">
                      This playlist is empty.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};
