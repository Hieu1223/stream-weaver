// --- Base Entities ---
export interface Channel {
  channel_id: string;
  display_name: string;
  username?: string;
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
  privacy: 'public' | 'private';
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