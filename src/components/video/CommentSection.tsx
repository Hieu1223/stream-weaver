import { useState, useEffect, useRef } from 'react';
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

interface CommentSectionProps {
  videoId: string;
}

interface CommentWithExtras extends Comment {
  channel?: Channel;
  userReaction: ReactionType;
}

export const CommentSection = ({ videoId }: CommentSectionProps) => {
  const [comments, setComments] = useState<CommentWithExtras[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { channel, token, isAuthenticated } = useAuth();
  const PAGE_SIZE = 10;

  // Initial Load
  useEffect(() => {
    setComments([]);
    setCurrentPage(0);
    setHasMore(true);
    fetchComments(0, true);
  }, [videoId]);

  const fetchComments = async (page: number, isInitial: boolean = false) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const data = await api.listComments(videoId, page, PAGE_SIZE);
      
      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

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
          } catch (e) { console.error(e); }
          return { ...c, channel: channelData, userReaction };
        })
      );

      setComments(prev => isInitial ? enriched : [...prev, ...enriched]);
    } catch (err) {
      toast.error('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchComments(nextPage);
  };

  const handleCommentReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!isAuthenticated || !channel || !token) {
      toast.error('Sign in to react');
      return;
    }

    const currentComment = comments.find(c => c.comment_id === commentId);
    if (!currentComment) return;

    const currentReaction = currentComment.userReaction;
    const newReaction: ReactionType = currentReaction === type ? 'none' : type;

    // --- Optimistic Update ---
    setComments(prev => prev.map(c => {
      if (c.comment_id === commentId) {
        let { like_count, dislike_count } = c;
        if (currentReaction === 'like') like_count--;
        if (currentReaction === 'dislike') dislike_count--;
        if (newReaction === 'like') like_count++;
        if (newReaction === 'dislike') dislike_count++;
        return { ...c, userReaction: newReaction, like_count, dislike_count };
      }
      return c;
    }));

    try {
      await api.setReaction(channel.channel_id, token, 'comment', commentId, newReaction);
    } catch (err) {
      toast.error('Action failed');
      // On error, we just re-fetch the current state to fix the counts
      fetchComments(0, true); 
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
      // Reset to page 0 to show the newest comment at the top
      setCurrentPage(0);
      setHasMore(true);
      fetchComments(0, true);
      toast.success('Comment posted!');
    } catch (err) {
      toast.error('Failed to post comment');
    }
  };

  // ... (handleEdit and handleDelete remain the same, calling fetchComments(0, true) on success)

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
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setNewComment('')}>Cancel</Button>
              <Button type="submit" disabled={!newComment.trim() || isLoading}>Comment</Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground text-center py-4 text-sm bg-secondary/20 rounded-lg">
          Sign in to join the conversation
        </p>
      )}

      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.comment_id} className="flex gap-4 group">
            <Avatar className="w-10 h-10">
              <AvatarImage src={comment.channel?.profile_pic_path} />
              <AvatarFallback>{comment.channel?.display_name?.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.channel?.display_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.comment_time), { addSuffix: true })}
                </span>
              </div>

              {editingId === comment.comment_id ? (
                <div className="mt-2 space-y-2">
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => {/* handleEdit logic */}}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1 leading-relaxed">{comment.content}</p>
              )}

              <div className="flex items-center gap-1 mt-2">
                <Button 
                  variant="ghost" size="sm" className="h-8 px-2"
                  onClick={() => handleCommentReaction(comment.comment_id, 'like')}
                >
                  <ThumbsUp className={cn("w-4 h-4 mr-1.5", comment.userReaction === 'like' && "fill-primary text-primary")} />
                  <span className="text-xs">{comment.like_count}</span>
                </Button>
                
                <Button 
                  variant="ghost" size="sm" className="h-8 px-2"
                  onClick={() => handleCommentReaction(comment.comment_id, 'dislike')}
                >
                  <ThumbsDown className={cn("w-4 h-4 mr-1.5", comment.userReaction === 'dislike' && "fill-destructive text-destructive")} />
                  <span className="text-xs">{comment.dislike_count}</span>
                </Button>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}

        {hasMore && !isLoading && (
          <Button 
            variant="outline" 
            className="w-full rounded-full mt-4" 
            onClick={handleLoadMore}
          >
            Load More Comments
          </Button>
        )}
      </div>
    </div>
  );
};