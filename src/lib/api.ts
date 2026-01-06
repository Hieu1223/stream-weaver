import {
  Channel, Video, Playlist, Comment,
  MessageResponse, AuthResponse, CreateCommentResponse, CreateVideoResponse,
  UpdateChannelData, UpdateChannelResponse, UpdateVideoData, UpdateVideoResponse,
  HistoryUpdateResponse, WatchProgress, ReactionResponse, ReactionStatus,
  ReactionType, TargetType, LightWeightVideo, LightWeightChannel, SubscriptionStatusResponse,
  ChannelCreationForm
} from './models';

const BASE_URL = "http://localhost:8000";

// --- Path Correction Helpers ---

/**
 * Ensures backend paths (e.g. "files/images/xyz") are converted to full URLs with extensions.
 */
const _fixPath = (path: string | undefined | null): string => {
  if (!path || path === 'no') return '';
  if (path.includes('files/')) {
    // Prevent double-prefixing if the path is already a full URL
    if (path.startsWith('http')) return path;
    return `${BASE_URL}/${path}.jpg`;
  }
  return path;
};

/**
 * Traverses an object and fixes any thumbnail or profile pic paths found.
 * Works for both single objects and arrays.
 */
const _enrich = <T>(data: T): T => {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => _enrich(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const obj = { ...data } as any;
    if ('thumbnail_path' in obj) obj.thumbnail_path = _fixPath(obj.thumbnail_path);
    if ('profile_pic_path' in obj) obj.profile_pic_path = _fixPath(obj.profile_pic_path);

    // Also check for nested video/channel objects in responses
    if (obj.video) obj.video = _enrich(obj.video);
    if (obj.channel) obj.channel = _enrich(obj.channel);
    if (obj.videos) obj.videos = _enrich(obj.videos);

    return obj as T;
  }

  return data;
};

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
  return response.json().then(data => _enrich(data));
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

export const createChannel = (data: ChannelCreationForm & { password?: string }): Promise<Channel & { message: string }> =>
  _request("/management/channels/", { method: "POST", body: JSON.stringify(data) });

export const getChannelDetail = (id: string): Promise<Channel> =>
  _request(`/management/channels/${id}`);

export const updateChannel = async (channelId: string, data: UpdateChannelData): Promise<UpdateChannelResponse> => {
  const formData = new FormData();
  formData.append("auth_token", data.auth_token);
  if (data.display_name) formData.append("display_name", data.display_name);
  if (data.description) formData.append("description", data.description);
  if (data.username) formData.append("username", data.username);
  if (data.password) formData.append("password", data.password);
  if (data.profile_pic) formData.append("profile_pic", data.profile_pic);

  const response = await fetch(`${BASE_URL}/management/channels/${channelId}`, {
    method: "PUT",
    body: formData,
  });

  if (!response.ok) throw { status: response.status, ...(await response.json()) };
  return response.json().then(data => _enrich(data));
};

export const listChannels = (page = 0, pageSize = 10): Promise<LightWeightChannel[]> =>
  _request(`/management/channels/${_buildQuery({ page, page_size: pageSize })}`);

export const searchChannels = (keyword: string, page = 0, pageSize = 10): Promise<LightWeightChannel[]> =>
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

export const getAccessibleVideos = (viewer_id: string | null, page = 0, pageSize = 10): Promise<LightWeightVideo[]> =>
  _request(`/management/video/accessible${_buildQuery({ page, page_size: pageSize })}`, { method: "POST", body: JSON.stringify({ viewer_id }) });

export const getChannelVideos = (channelId: string, page: number, page_size: number, auth_token: string | null): Promise<LightWeightVideo[]> =>
  _request(`/management/video/channel/${channelId}?page=${page}&page_size=${page_size}`, { method: "POST", body: JSON.stringify({ auth_token }) });

export const searchVideos = (keyword: string, page = 0, pageSize = 10): Promise<Partial<Video>[]> =>
  _request(`/management/video/search${_buildQuery({ keyword, page, page_size: pageSize })}`);

export const updateVideo = async (channelId: string, videoId: string, data: UpdateVideoData): Promise<UpdateVideoResponse> => {
  const formData = new FormData();
  formData.append("auth_token", data.auth_token);
  if (data.title) formData.append("title", data.title);
  if (data.description) formData.append("description", data.description);
  if (data.privacy) formData.append("privacy", data.privacy);
  if (data.thumbnail_file) formData.append("thumbnail_file", data.thumbnail_file);

  const response = await fetch(`${BASE_URL}/management/video/channel/${channelId}/${videoId}`, {
    method: "PUT",
    body: formData,
  });

  if (!response.ok) throw { status: response.status, ...(await response.json()) };
  return response.json().then(data => _enrich(data));
};

export const viewVideo = (id: string): Promise<MessageResponse> =>
  _request(`/management/video/${id}/view`, { method: "POST" });

export const deleteVideo = (id: string, channel_id: string, auth_token: string): Promise<MessageResponse> =>
  _request(`/management/video/${id}`, { method: "DELETE", body: JSON.stringify({ channel_id, auth_token }) });

// --- PLAYLISTS ---

export const getChannelPlaylists = (
  channelId: string,
  page: number = 0,
  pageSize: number = 10
): Promise<Playlist[]> =>
  _request<Playlist[]>(
    `/management/playlists/${channelId}${_buildQuery({ page, page_size: pageSize })}`
  );

export const createPlaylist = (channel_id: string, name: string, auth_token: string): Promise<Playlist> =>
  _request("/management/playlists/", { method: "POST", body: JSON.stringify({ channel_id, name, auth_token }) });

export const addVideoToPlaylist = (playlistId: string, video_id: string, auth_token: string): Promise<MessageResponse> =>
  _request(`/management/playlists/${playlistId}/videos`, { method: "POST", body: JSON.stringify({ video_id, auth_token }) });

export const getPlaylistVideos = (id: string): Promise<Partial<Video>[]> =>
  _request(`/management/playlists/${id}/videos`);


export async function getPlaylistsFromVideo(
  videoId: string,
  channelId: string
): Promise<Playlist[]> {
  const response = await fetch(`${BASE_URL}/management/playlists/from_video/${videoId}/${channelId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // Handle the 500 error raised by your FastAPI route
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to fetch playlists');
  }

  return response.json();
}

export const removeVideoFromPlaylist = (playlistId: string, videoId: string, auth_token: string): Promise<MessageResponse> =>
  _request(`/management/playlists/${playlistId}/${videoId}`, { method: "DELETE", body: JSON.stringify({ auth_token }) });

export const deletePlaylist = (id: string, auth_token: string): Promise<MessageResponse> =>
  _request(`/management/playlists/${id}`, { method: "DELETE", body: JSON.stringify({ auth_token }) });

// --- SUBSCRIPTIONS ---

export const subscribe = (channel_id: string, subscriber_id: string, auth_token: string): Promise<MessageResponse> =>
  _request("/management/subscription/", { method: "POST", body: JSON.stringify({ channel_id, subscriber_id, auth_token }) });

export const unsubscribe = (channel_id: string, subscriber_id: string, auth_token: string): Promise<MessageResponse> =>
  _request("/management/subscription/", { method: "DELETE", body: JSON.stringify({ channel_id, subscriber_id, auth_token }) });

export const listSubscriptions = async (subscriberId: string, authToken: string, page = 0, pageSize = 10): Promise<LightWeightChannel[]> => {
  const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
  return _request<LightWeightChannel[]>(`/management/subscription/list?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify({ subscriber_id: subscriberId, auth_token: authToken }),
  });
};

// --- COMMENTS ---

export const createComment = (data: { video_id: string, user_id: string, content: string, auth_token: string }): Promise<CreateCommentResponse> =>
  _request("/management/comments/", { method: "POST", body: JSON.stringify(data) });

export const listComments = (videoId: string, page = 0, pageSize = 10): Promise<Comment[]> => {
  const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
  return _request(`/management/comments/${videoId}?${params.toString()}`);
};

export const updateComment = (id: string, content: string, auth_token: string): Promise<CreateCommentResponse> =>
  _request(`/management/comments/${id}`, { method: "PUT", body: JSON.stringify({ content, auth_token }) });

export const deleteComment = (id: string, auth_token: string): Promise<MessageResponse> =>
  _request(`/management/comments/${id}`, { method: "DELETE", body: JSON.stringify({ auth_token }) });

// --- HISTORY ---

export const getWatchHistory = async (channelId: string, authToken: string): Promise<WatchProgress[]> => {
  return _request<WatchProgress[]>("/management/history/", {
    method: "POST",
    body: JSON.stringify({ channel_id: channelId, auth_token: authToken }),
  });
};

export const updateWatchHistory = async (channelId: string, videoId: string, seconds: number, authToken: string): Promise<HistoryUpdateResponse> => {
  return _request<HistoryUpdateResponse>("/management/history/", {
    method: "PUT",
    body: JSON.stringify({ channel_id: channelId, video_id: videoId, seconds, auth_token: authToken }),
  });
};

// --- REACTIONS ---

export const setReaction = (channel_id: string, auth_token: string, target_type: TargetType, target_id: string, reaction: ReactionType): Promise<ReactionResponse> =>
  _request("/management/reaction/", {
    method: "POST",
    body: JSON.stringify({ channel_id, auth_token, target_type, target_id, reaction })
  });

export const getLikedVideos = (viewer_id: string, auth_token: string, page = 0, page_size = 20): Promise<{ page: number; page_size: number; total: number; videos: LightWeightVideo[] }> =>
  _request(`/management/video/liked${_buildQuery({ viewer_id, auth_token, page, page_size })}`);

export const getReaction = (channel_id: string, target_type: TargetType, target_id: string): Promise<ReactionStatus> =>
  _request(`/management/reaction/${_buildQuery({ channel_id, target_type, target_id })}`);


export const checkSubscriptionStatus = (
  subscriber_id: string,
  channel_id: string
): Promise<SubscriptionStatusResponse> =>
  _request<SubscriptionStatusResponse>(
    `/management/subscription/status${_buildQuery({ subscriber_id, channel_id })}`
  );