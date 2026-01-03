
export type ReactionType = 'like' | 'dislike' | 'none';
export type TargetType = 'video' | 'comment';
// --- Base Entities ---
export interface Channel {
  channel_id: string;
  display_name: string;
  username: string;
  description: string;
  profile_pic_path: string;
  subscriber_count: number;
  created_at: string;
  auth_token?: string; // Only present on creation/login
}

export interface Video {
  video_id: string;
  channel_id: string;
  title: string;
  description: string;
  upload_time: string;
  video_path: string;
  thumbnail_path: string;
  views_count: number;
  like_count: number;
  dislike_count: number;
  privacy: 'public' | 'private' | 'limited';
  last_position_second?: number | null;
}

export interface Playlist {
  playlist_id: string;
  channel_id: string;
  playlist_name: string;
  created_at: string;
}

export interface Comment {
  comment_id: string;
  parent_comment_id: string | null;
  video_id: string;
  channel_id: string;
  content: string;
  like_count: number;
  dislike_count: number;
  comment_time: string;
}

// --- API Response Envelopes ---
export interface MessageResponse {
  message: string;
  extra?: string;
}

export interface AuthResponse {
  auth_token: string;
}

export interface CreateCommentResponse {
  message: string;
  result: Comment;
}

export interface CreateVideoResponse {
  message: string;
  video: Video;
}


export interface UpdateChannelResponse {
  message: string;
  auth_token: string | null;
  channel: Channel; // The full updated channel object
}

export interface UpdateChannelData {
  auth_token: string;
  display_name?: string;
  description?: string;
  username?: string;
  password?: string;
  profile_pic?: Blob | File; // Now supports binary upload
}

export interface UpdateVideoData {
  auth_token: string;
  title?: string;
  description?: string;
  privacy?: 'public' | 'private' | 'limited';
  thumbnail_file?: Blob | File; // Binary file for the thumbnail
}

export interface UpdateVideoResponse {
  message: string;
  video: Video; // The full video object returned from the DB
}


export interface WatchProgress {
  video_id: string;
  last_position_second: number;
}

export interface HistoryUpdateResponse {
  message: string;
}


export interface ReactionResponse {
  message: string;
}

export interface ReactionStatus {
  reaction: ReactionType;
}


export interface LightWeightVideo{
  video_id: string;
  channel_id: string;
  title: string;
  upload_time: string;
  thumbnail_path: string;
  views_count: number;
  last_position_second?: number | null;
}


export interface LightWeightChannel{
  channel_id: string;
  display_name: string;
  profile_pic_path: string;
}


export interface SubscriptionStatusResponse {
  is_subscribed: boolean;
}