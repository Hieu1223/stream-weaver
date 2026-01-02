import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Clock, ThumbsUp, ListVideo, Users, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
}

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Flame, label: 'Trending', path: '/trending' },
  { icon: Compass, label: 'Explore', path: '/explore' },
];

const libraryItems = [
  { icon: Clock, label: 'History', path: '/history' },
  { icon: ThumbsUp, label: 'Liked Videos', path: '/liked' },
  { icon: ListVideo, label: 'Playlists', path: '/playlists' },
];

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const NavLink = ({ icon: Icon, label, path }: { icon: any; label: string; path: string }) => {
    const isActive = location.pathname === path;
    
    return (
      <Link
        to={path}
        className={cn(
          "flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200",
          "hover:bg-secondary",
          isActive && "bg-secondary text-primary"
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {isOpen && <span className="text-sm font-medium">{label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-sidebar border-r border-sidebar-border z-40 transition-all duration-300",
        isOpen ? "w-56" : "w-16"
      )}
    >
      <nav className="flex flex-col p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.path} {...item} />
        ))}
        
        {isAuthenticated && (
          <>
            <div className={cn("py-3", isOpen && "px-4")}>
              <div className="h-px bg-border" />
            </div>
            
            {isOpen && (
              <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Library
              </p>
            )}
            
            {libraryItems.map((item) => (
              <NavLink key={item.path} {...item} />
            ))}
            
            <div className={cn("py-3", isOpen && "px-4")}>
              <div className="h-px bg-border" />
            </div>
            
            {isOpen && (
              <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Subscriptions
              </p>
            )}
            
            <NavLink icon={Users} label="Subscriptions" path="/subscriptions" />
          </>
        )}
      </nav>
    </aside>
  );
};
