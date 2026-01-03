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
import { Comment, Channel, ReactionType } from '@/lib/models';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */

interface CommentSectionProps {
  videoId: string;
}

interface CommentWithExtras extends Comment {
  channel?: Channel;
  userReaction: ReactionType;
}

/* ------------------------------------------------------------------ */

export const CommentSection = ({ videoId }: CommentSectionProps) => {
  const { channel, token, isAuthenticated } = useAuth();

  const [comments, setComments] = useState<CommentWithExtras[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const PAGE_SIZE = 10;

  /* ---------------------------- load comments ---------------------------- */

  useEffect(() => {
    resetAndFetch();
  }, [videoId]);

  const resetAndFetch = () => {
    setComments([]);
    setCurrentPage(0);
    setHasMore(true);
    fetchComments(0, true);
  };

  const fetchComments = async (page: number, isInitial = false) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const data = await api.listComments(videoId, page, PAGE_SIZE);

      if (data.length < PAGE_SIZE) setHasMore(false);

      const enriched = await Promise.all(
        data.map(async (c) => {
          let channelData: Channel | undefined;
          let userReaction: ReactionType = 'none';

          try {
            channelData = await api.getChannelDetail(c.channel_id);
            if (isAuthenticated && channel) {
              const r = await api.getReaction(channel.channel_id, 'comment', c.comment_id);
              userReaction = r.reaction;
            }
          } catch {}

          return { ...c, channel: channelData, userReaction };
        })
      );

      setComments(prev => isInitial ? enriched : [...prev, ...enriched]);
    } catch {
      toast.error('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    const next = currentPage + 1;
    setCurrentPage(next);
    fetchComments(next);
  };

  /* ---------------------------- reactions ---------------------------- */

  const handleReaction = async (id: string, type: 'like' | 'dislike') => {
    if (!isAuthenticated || !channel || !token) {
      toast.error('Sign in to react');
      return;
    }

    const target = comments.find(c => c.comment_id === id);
    if (!target) return;

    const prev = target.userReaction;
    const next: ReactionType = prev === type ? 'none' : type;

    setComments(prevState =>
      prevState.map(c => {
        if (c.comment_id !== id) return c;

        let { like_count, dislike_count } = c;
        if (prev === 'like') like_count--;
        if (prev === 'dislike') dislike_count--;
        if (next === 'like') like_count++;
        if (next === 'dislike') dislike_count++;

        return { ...c, userReaction: next, like_count, dislike_count };
      })
    );

    try {
      await api.setReaction(channel.channel_id, token, 'comment', id, next);
    } catch {
      toast.error('Reaction failed');
      resetAndFetch();
    }
  };

  /* ---------------------------- create ---------------------------- */

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
      resetAndFetch();
      toast.success('Comment posted');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  /* ---------------------------- edit ---------------------------- */

  const startEdit = (comment: CommentWithExtras) => {
    setEditingId(comment.comment_id);
    setEditContent(comment.content);
  };

  const handleUpdate = async () => {
    if (!editingId || !token) return;

    try {
      await api.updateComment(editingId, editContent, token);
      toast.success('Comment updated');
      setEditingId(null);
      resetAndFetch();
    } catch {
      toast.error('Failed to update comment');
    }
  };

  /* ---------------------------- delete ---------------------------- */

  const handleDelete = async (id: string) => {
    if (!token) return;

    try {
      await api.deleteComment(id, token);
      toast.success('Comment deleted');
      setComments(prev => prev.filter(c => c.comment_id !== id));
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  /* ---------------------------- render ---------------------------- */

  return (
    <div className="mt-6 space-y-6">
      <h3 className="text-lg font-semibold">Comments</h3>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={channel?.profile_pic_path} />
            <AvatarFallback>{channel?.display_name?.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setNewComment('')}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newComment.trim()}>
                Comment
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-4">
          Sign in to join the conversation
        </p>
      )}

      <div className="space-y-6">
        {comments.map(comment => {
          const isOwner = channel?.channel_id === comment.channel_id;

          return (
            <div key={comment.comment_id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={comment.channel?.profile_pic_path} />
                <AvatarFallback>{comment.channel?.display_name?.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.channel?.display_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.comment_time), { addSuffix: true })}
                    </span>
                  </div>

                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEdit(comment)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(comment.comment_id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {editingId === comment.comment_id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdate}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-1">{comment.content}</p>
                )}

                <div className="flex items-center gap-1 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction(comment.comment_id, 'like')}
                  >
                    <ThumbsUp className={cn(
                      "w-4 h-4 mr-1",
                      comment.userReaction === 'like' && "fill-primary text-primary"
                    )} />
                    {comment.like_count}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction(comment.comment_id, 'dislike')}
                  >
                    <ThumbsDown className={cn(
                      "w-4 h-4 mr-1",
                      comment.userReaction === 'dislike' && "fill-destructive text-destructive"
                    )} />
                    {comment.dislike_count}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {hasMore && !isLoading && (
          <Button variant="outline" className="w-full" onClick={handleLoadMore}>
            Load more comments
          </Button>
        )}
      </div>
    </div>
  );
};
