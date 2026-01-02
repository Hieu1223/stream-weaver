import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { HomePage } from "@/pages/HomePage";
import { WatchPage } from "@/pages/WatchPage";
import { ChannelPage } from "@/pages/ChannelPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { UploadPage } from "@/pages/UploadPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SearchPage } from "@/pages/SearchPage";
import { EditVideoPage } from "@/pages/EditVideoPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { LikedVideosPage } from "@/pages/LikedVideosPage";
import { PlaylistsPage } from "@/pages/PlaylistsPage";
import { SubscriptionsPage } from "@/pages/SubscriptionsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/watch/:videoId" element={<WatchPage />} />
              <Route path="/channel/:channelId" element={<ChannelPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/edit/:videoId" element={<EditVideoPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/liked" element={<LikedVideosPage />} />
              <Route path="/playlists" element={<PlaylistsPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
