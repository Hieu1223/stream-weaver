import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Upload, Menu, User, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { channel, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="shrink-0">
            <Menu className="w-5 h-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow">
              <span className="text-primary-foreground font-display font-bold text-lg">V</span>
            </div>
            <span className="font-display font-bold text-xl hidden sm:block">VidStream</span>
          </Link>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
          <div className="relative flex">
            <Input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-r-none bg-secondary border-r-0 focus-visible:ring-primary"
            />
            <Button 
              type="submit" 
              variant="secondary" 
              className="rounded-l-none border-l-0 px-6"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </form>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/upload')}
                className="relative"
              >
                <Upload className="w-5 h-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={channel?.profile_pic_path !== 'no' ? channel?.profile_pic_path : undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {channel?.display_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium">{channel?.display_name}</p>
                    <p className="text-sm text-muted-foreground truncate">@{channel?.username}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/channel/${channel?.channel_id}`)}>
                    <User className="mr-2 h-4 w-4" />
                    Your Channel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => navigate('/login')} className="glow">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
