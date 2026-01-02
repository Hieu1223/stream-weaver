import { 
  Channel, Video, Playlist, Comment, 
  MessageResponse, AuthResponse, CreateCommentResponse, CreateVideoResponse 
} from './models';

const BASE_URL = "http://localhost:8000";

// --- Internal Helper ---
const _request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = { ...options.headers as any };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw { status: response.status, ...error };
  }
  return response.json();
};

const _buildQuery = (params: Record<string, any>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) search.append(key, String(val));
  });
  const s = search.toString();
  return s ? `?${s}` : "";
};

// --- AUTH ---
export const getToken = (username: string, password: string): Promise<AuthResponse> => 
  _request(`/management/auth/token${_buildQuery({ username, password })}`);

export const getIdFromToken = (token: string): Promise<{ channel_id: string }> => 
  _request(`/management/auth/id${_buildQuery({ token })}`);

// --- CHANNELS ---
export const createChannel = (data: Partial<Channel> & { password?: string }): Promise<Channel & { message: string }> => 
  _request("/management/channels/", { method: "POST", body: JSON.stringify(data) });

export const getChannelDetail = (id: string): Promise<Channel> => 
  _request(`/management/channels/${id}`);

export const updateChannel = (id: string, data: any): Promise<MessageResponse> => 
  _request(`/management/channels/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const listChannels = (page = 0, pageSize = 10): Promise<Partial<Channel>[]> => 
  _request(`/management/channels/${_buildQuery({ page, page_size: pageSize })}`);

export const searchChannels = (keyword: string, page = 0, pageSize = 10): Promise<Partial<Channel>[]> => 
  _request(`/management/channels/search/${_buildQuery({ keyword, page, page_size: pageSize })}`);

export const deleteChannel = (id: string, auth_token: string): Promise<MessageResponse> => 
  _request(`/management/channels/${id}`, { method: "DELETE", body: JSON.stringify({ auth_token }) });

// --- VIDEOS ---
export const createVideo = (channelId: string, authToken: string, title: string, description: string, videoFile: Blob): Promise<CreateVideoResponse> => {
  const formData = new FormData();
  formData.append("channel_id", channelId);
  formData.append("auth_token", authToken);
  formData.append("title", title);
  formData.append("description", description);
  formData.append("video_file", videoFile);
  return _request("/management/video/", { method: "POST", body: formData });
};

export const getVideoDetail = (videoId: string, viewer_id: string | null): Promise<Video> => 
  _request(`/management/video/aggregate/${videoId}`, { method: "POST", body: JSON.stringify({ viewer_id }) });

export const getAccessibleVideos = (viewer_id: string | null, page = 0, pageSize = 10): Promise<{video_id: string}[]> => 
  _request(`/management/video/accessible${_buildQuery({ page, page_size: pageSize })}`, { method: "POST", body: JSON.stringify({ viewer_id }) });

export const getChannelVideos = (channelId: string, auth_token: string | null): Promise<Video[]> => 
  _request(`/management/video/channel/${channelId}`, { method: "POST", body: JSON.stringify({ auth_token }) });

export const searchVideos = (keyword: string, page = 0, pageSize = 10): Promise<Partial<Video>[]> => 
  _request(`/management/video/search${_buildQuery({ keyword, page, page_size: pageSize })}`);

export const likeVideo = (id: string): Promise<MessageResponse> => _request(`/management/video/${id}/like`, { method: "POST" });
export const dislikeVideo = (id: string): Promise<MessageResponse> => _request(`/management/video/${id}/dislike`, { method: "POST" });
export const viewVideo = (id: string): Promise<MessageResponse> => _request(`/management/video/${id}/view`, { method: "POST" });

export const deleteVideo = (id: string, channel_id: string, auth_token: string): Promise<MessageResponse> => 
  _request(`/management/video/${id}`, { method: "DELETE", body: JSON.stringify({ channel_id, auth_token }) });

// --- PLAYLISTS ---
export const createPlaylist = (channel_id: string, name: string, auth_token: string): Promise<Playlist> => 
  _request("/management/playlists/", { method: "POST", body: JSON.stringify({ channel_id, name, auth_token }) });

export const addVideoToPlaylist = (playlistId: string, video_id: string, auth_token: string): Promise<MessageResponse> => 
  _request(`/management/playlists/${playlistId}/videos`, { method: "POST", body: JSON.stringify({ video_id, auth_token }) });

export const getPlaylistVideos = (id: string): Promise<Partial<Video>[]> => 
  _request(`/management/playlists/${id}/videos`);

export const removeVideoFromPlaylist = (playlistId: string, videoId: string, auth_token: string): Promise<MessageResponse> => 
  _request(`/management/playlists/${playlistId}/${videoId}`, { method: "DELETE", body: JSON.stringify({ auth_token }) });

export const deletePlaylist = (id: string, auth_token: string): Promise<MessageResponse> => 
  _request(`/management/playlists/${id}`, { method: "DELETE", body: JSON.stringify({ auth_token }) });

// --- SUBSCRIPTIONS ---
export const subscribe = (channel_id: string, subscriber_id: string, auth_token: string): Promise<MessageResponse> => 
  _request("/management/subscription/", { method: "POST", body: JSON.stringify({ channel_id, subscriber_id, auth_token }) });

export const unsubscribe = (channel_id: string, subscriber_id: string, auth_token: string): Promise<MessageResponse> => 
  _request("/management/subscription/", { method: "DELETE", body: JSON.stringify({ channel_id, subscriber_id, auth_token }) });

// --- COMMENTS ---
export const createComment = (data: { video_id: string, user_id: string, content: string, auth_token: string }): Promise<CreateCommentResponse> => 
  _request("/management/comments/", { method: "POST", body: JSON.stringify(data) });

export const listComments = (videoId: string): Promise<Comment[]> => 
  _request(`/management/comments/${videoId}`);

export const updateComment = (id: string, content: string, auth_token: string): Promise<CreateCommentResponse> => 
  _request(`/management/comments/${id}`, { method: "PUT", body: JSON.stringify({ content, auth_token }) });

export const deleteComment = (id: string, auth_token: string): Promise<MessageResponse> => 
  _request(`/management/comments/${id}`, { method: "DELETE", body: JSON.stringify({ auth_token }) });

export const likeComment = (id: string): Promise<MessageResponse> => _request(`/management/comments/${id}/like`, { method: "POST" });
export const dislikeComment = (id: string): Promise<MessageResponse> => _request(`/management/comments/${id}/dislike`, { method: "POST" });