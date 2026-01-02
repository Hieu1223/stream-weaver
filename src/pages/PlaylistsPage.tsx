import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { createPlaylist, deletePlaylist, getPlaylistVideos } from '@/lib/api';
import { Playlist, Video } from '@/lib/models';
import { ListVideo, Plus, Trash2, LogIn, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VideoCard } from '@/components/video/VideoCard';
import { useToast } from '@/hooks/use-toast';

export const PlaylistsPage = () => {
  const { channel, token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<Record<string, Partial<Video>[]>>({});
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Note: API doesn't have a list playlists endpoint, so we start empty
    // Users create playlists here and they persist in state
    setLoading(false);
  }, []);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !channel?.channel_id || !token) return;

    setCreating(true);
    try {
      const playlist = await createPlaylist(channel.channel_id, newPlaylistName, token);
      setPlaylists([...playlists, playlist]);
      setNewPlaylistName('');
      toast({ title: 'Playlist created!' });
    } catch (error) {
      toast({ title: 'Failed to create playlist', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!token) return;

    try {
      await deletePlaylist(playlistId, token);
      setPlaylists(playlists.filter(p => p.playlist_id !== playlistId));
      toast({ title: 'Playlist deleted' });
    } catch (error) {
      toast({ title: 'Failed to delete playlist', variant: 'destructive' });
    }
  };

  const togglePlaylist = async (playlistId: string) => {
    if (expandedPlaylist === playlistId) {
      setExpandedPlaylist(null);
      return;
    }

    setExpandedPlaylist(playlistId);
    
    if (!playlistVideos[playlistId]) {
      try {
        const videos = await getPlaylistVideos(playlistId);
        setPlaylistVideos({ ...playlistVideos, [playlistId]: videos });
      } catch (error) {
        console.error('Failed to fetch playlist videos:', error);
      }
    }
  };

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

  return (
    <Layout>
      <Helmet>
        <title>Playlists - VidStream</title>
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ListVideo className="w-8 h-8" />
          Playlists
        </h1>
      </div>

      {/* Create Playlist */}
      <div className="flex gap-3 mb-8">
        <Input
          placeholder="New playlist name..."
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
          className="max-w-sm"
        />
        <Button onClick={handleCreatePlaylist} disabled={creating || !newPlaylistName.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Create
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-12">
          <ListVideo className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No playlists yet. Create one above!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {playlists.map((playlist) => (
            <div key={playlist.playlist_id} className="border border-border rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => togglePlaylist(playlist.playlist_id)}
              >
                <div className="flex items-center gap-3">
                  <ListVideo className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{playlist.playlist_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.playlist_id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                  {expandedPlaylist === playlist.playlist_id ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>
              
              {expandedPlaylist === playlist.playlist_id && (
                <div className="p-4 bg-background border-t border-border">
                  {playlistVideos[playlist.playlist_id]?.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {playlistVideos[playlist.playlist_id].map((video) => (
                        <VideoCard key={video.video_id} video={video as Video} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No videos in this playlist</p>
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
