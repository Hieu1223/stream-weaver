import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { createPlaylist, deletePlaylist, getPlaylistVideos, getChannelPlaylists } from '@/lib/api';
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

  // Memoized fetch function to reuse after creation/deletion
  const fetchPlaylists = useCallback(async () => {
    if (!channel?.channel_id) return;
    try {
      setLoading(true);
      // Fetching first 50 playlists for the channel
      const data = await getChannelPlaylists(channel.channel_id, 0, 50);
      setPlaylists(data as Playlist[]);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      toast({ title: 'Error loading playlists', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [channel?.channel_id, toast]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaylists();
    }
  }, [isAuthenticated, fetchPlaylists]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !channel?.channel_id || !token) return;

    setCreating(true);
    try {
      await createPlaylist(channel.channel_id, newPlaylistName, token);
      setNewPlaylistName('');
      toast({ title: 'Playlist created!' });
      // Refresh list from backend to get the real ID and metadata
      await fetchPlaylists();
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
      setPlaylists(prev => prev.filter(p => p.playlist_id !== playlistId));
      if (expandedPlaylist === playlistId) setExpandedPlaylist(null);
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
    
    // Only fetch if we haven't loaded videos for this playlist yet
    if (!playlistVideos[playlistId]) {
      try {
        const videos = await getPlaylistVideos(playlistId);
        setPlaylistVideos(prev => ({ ...prev, [playlistId]: videos }));
      } catch (error) {
        console.error('Failed to fetch playlist videos:', error);
        toast({ title: 'Could not load videos', variant: 'destructive' });
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
          My Playlists
        </h1>
      </div>

      {/* Create Playlist UI */}
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
          {creating ? 'Creating...' : 'Create'}
        </Button>
      </div>

      {loading && playlists.length === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <ListVideo className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No playlists yet. Create your first one above!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {playlists.map((playlist) => (
            <div key={playlist.playlist_id} className="border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div 
                className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => togglePlaylist(playlist.playlist_id)}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-2 rounded">
                    <ListVideo className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold block">{playlist.playlist_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if(window.confirm('Delete this playlist?')) {
                        handleDeletePlaylist(playlist.playlist_id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {expandedPlaylist === playlist.playlist_id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {expandedPlaylist === playlist.playlist_id && (
                <div className="p-4 bg-background border-t border-border">
                  {playlistVideos[playlist.playlist_id]?.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {playlistVideos[playlist.playlist_id].map((video) => (
                        <VideoCard key={video.video_id} video={video as Video} />
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground text-sm">This playlist is empty.</p>
                      <Button variant="link" asChild>
                        <Link to="/">Browse videos to add some!</Link>
                      </Button>
                    </div>
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