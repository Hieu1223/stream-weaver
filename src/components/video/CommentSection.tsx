import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, ThumbsDown, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Comment, Channel } from '@/lib/models';
import * as api from '@/lib/api';
import { toast } from 'sonner';

interface CommentSectionProps {
  videoId: string;
}

interface CommentWithChannel extends Comment {
  channel?: Channel;
}

export const CommentSection = ({ videoId }: CommentSectionProps) => {
  const [comments, setComments] = useState<CommentWithChannel[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { channel, token, isAuthenticated } = useAuth();

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const data = await api.listComments(videoId);
      const commentsWithChannels = await Promise.all(
        data.map(async (comment) => {
          try {
            const channelData = await api.getChannelDetail(comment.channel_id);
            return { ...comment, channel: channelData };
          } catch {
            return comment;
          }
        })
      );
      setComments(commentsWithChannels);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !channel || !token) return;

    try {
      await api.createComment({
        video_id: videoId,
        user_id: channel.channel_id,
        content: newComment,
        auth_token: token,
      });
      setNewComment('');
      loadComments();
      toast.success('Comment posted!');
    } catch (err) {
      toast.error('Failed to post comment');
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim() || !token) return;

    try {
      await api.updateComment(commentId, editContent, token);
      setEditingId(null);
      loadComments();
      toast.success('Comment updated!');
    } catch (err) {
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!token) return;

    try {
      await api.deleteComment(commentId, token);
      loadComments();
      toast.success('Comment deleted!');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await api.likeComment(commentId);
      loadComments();
    } catch (err) {
      toast.error('Failed to like comment');
    }
  };

  const handleDislike = async (commentId: string) => {
    try {
      await api.dislikeComment(commentId);
      loadComments();
    } catch (err) {
      toast.error('Failed to dislike comment');
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <h3 className="text-lg font-semibold">{comments.length} Comments</h3>

      {/* Add comment form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={channel?.profile_pic_path !== 'no' ? channel?.profile_pic_path : undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {channel?.display_name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setNewComment('')}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newComment.trim()}>
                Comment
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground text-center py-4">
          Sign in to add a comment
        </p>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.comment_id} className="flex gap-4 animate-fade-in">
              <Avatar className="w-10 h-10">
                <AvatarImage 
                  src={comment.channel?.profile_pic_path !== 'no' ? comment.channel?.profile_pic_path : undefined} 
                />
                <AvatarFallback className="bg-secondary text-foreground">
                  {comment.channel?.display_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {comment.channel?.display_name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.comment_time), { addSuffix: true })}
                  </span>
                </div>

                {editingId === comment.comment_id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px] resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(comment.comment_id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-1">{comment.content}</p>
                )}

                <div className="flex items-center gap-4 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => handleLike(comment.comment_id)}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    <span className="text-xs">{comment.like_count}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => handleDislike(comment.comment_id)}
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    <span className="text-xs">{comment.dislike_count}</span>
                  </Button>

                  {channel?.channel_id === comment.channel_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingId(comment.comment_id);
                            setEditContent(comment.content);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(comment.comment_id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
