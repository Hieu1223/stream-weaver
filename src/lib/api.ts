import { 
  Channel, Video, Playlist, Comment, 
  MessageResponse, AuthResponse, CreateCommentResponse, CreateVideoResponse ,
  UpdateChannelData,UpdateChannelResponse,UpdateVideoData,UpdateVideoResponse,HistoryUpdateResponse,WatchProgress,ReactionResponse,ReactionStatus,ReactionType,TargetType
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


export const updateChannel = async (
  channelId: string, 
  data: UpdateChannelData
): Promise<UpdateChannelResponse> => {
  const formData = new FormData();

  // Append all non-null fields to the FormData object
  formData.append("auth_token", data.auth_token);
  
  if (data.display_name) formData.append("display_name", data.display_name);
  if (data.description) formData.append("description", data.description);
  if (data.username) formData.append("username", data.username);
  if (data.password) formData.append("password", data.password);
  
  if (data.profile_pic) {
    formData.append("profile_pic", data.profile_pic);
  }

  // We use fetch directly here because our _request helper 
  // defaults to JSON Content-Type headers.
  const response = await fetch(`${BASE_URL}/management/channels/${channelId}`, {
    method: "PUT",
    body: formData,
    // Note: Do NOT set Content-Type header manually; 
    // the browser will set it to multipart/form-data with the correct boundary.
  });

  if (!response.ok) {
    throw { status: response.status, ...(await response.json()) };
  }

  return response.json();
};

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


export const updateVideo = async (
  channelId: string,
  videoId: string,
  data: UpdateVideoData
): Promise<UpdateVideoResponse> => {
  const formData = new FormData();

  // Required Auth
  formData.append("auth_token", data.auth_token);

  // Optional Fields
  if (data.title) formData.append("title", data.title);
  if (data.description) formData.append("description", data.description);
  if (data.privacy) formData.append("privacy", data.privacy);
  
  // Optional Thumbnail File
  if (data.thumbnail_file) {
    formData.append("thumbnail_file", data.thumbnail_file);
  }

  const response = await fetch(
    `${BASE_URL}/management/video/channel/${channelId}/${videoId}`, 
    {
      method: "PUT",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to update video" }));
    throw { status: response.status, ...error };
  }

  return response.json();
};


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

export const listSubscriptions = async (
  subscriberId: string,
  authToken: string,
  page = 0,
  pageSize = 10
): Promise<Channel[]> => {
  // Build query string for pagination
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  return _request<Channel[]>(`/management/subscription/list?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify({
      subscriber_id: subscriberId,
      auth_token: authToken,
    }),
  });
};



// --- COMMENTS ---
export const createComment = (data: { video_id: string, user_id: string, content: string, auth_token: string }): Promise<CreateCommentResponse> => 
  _request("/management/comments/", { method: "POST", body: JSON.stringify(data) });

export const listComments = (
  videoId: string,
  page: number = 0,
  pageSize: number = 10
): Promise<Comment[]> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  return _request(`/management/comments/${videoId}?${params.toString()}`);
};

export const updateComment = (id: string, content: string, auth_token: string): Promise<CreateCommentResponse> => 
  _request(`/management/comments/${id}`, { method: "PUT", body: JSON.stringify({ content, auth_token }) });

export const deleteComment = (id: string, auth_token: string): Promise<MessageResponse> => 
  _request(`/management/comments/${id}`, { method: "DELETE", body: JSON.stringify({ auth_token }) });

// --- HISTORY ---

/**
 * Fetches the user's watch history.
 * Uses POST to keep the auth_token in the request body.
 */
export const getWatchHistory = async (
  channelId: string,
  authToken: string
): Promise<WatchProgress[]> => {
  return _request<WatchProgress[]>("/management/history/", {
    method: "POST",
    body: JSON.stringify({
      channel_id: channelId,
      auth_token: authToken,
    }),
  });
};

/**
 * Updates the current playback position for a specific video.
 * Triggered periodically during video playback.
 */
export const updateWatchHistory = async (
  channelId: string,
  videoId: string,
  seconds: number,
  authToken: string
): Promise<HistoryUpdateResponse> => {
  console.log(channelId,seconds)
  return _request<HistoryUpdateResponse>("/management/history/", {
    method: "PUT",
    body: JSON.stringify({
      channel_id: channelId,
      video_id: videoId,
      seconds: seconds,
      auth_token: authToken,
    }),
  });
};
// --- REACTIONS ---

/**
 * React to a video or comment.
 * reaction: "like", "dislike", or "none" (to remove)
 */
export const setReaction = (
  channel_id: string,
  auth_token: string,
  target_type: TargetType,
  target_id: string,
  reaction: ReactionType
): Promise<ReactionResponse> => 
  _request("/management/reaction/", { 
    method: "POST", 
    body: JSON.stringify({ 
      channel_id, 
      auth_token, 
      target_type, 
      target_id, 
      reaction 
    }) 
  });

/**
 * Get the current reaction of a user for a video or comment.
 */
export const getReaction = (
  channel_id: string,
  target_type: TargetType,
  target_id: string
): Promise<ReactionStatus> => 
  _request(`/management/reaction/${_buildQuery({ channel_id, target_type, target_id })}`);