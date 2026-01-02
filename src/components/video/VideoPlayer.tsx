import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  videoPath: string;
  onView?: () => void;
  onProgress?: (seconds: number) => void; // New prop for history
}

/* ---------------- utils ---------------- */

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(
    /(?:youtube\.com\/(?:.*v=|v\/|embed\/)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return m ? m[1] : null;
};

/* ---------------- component ---------------- */

export const VideoPlayer = ({ videoPath, onView, onProgress }: VideoPlayerProps) => {
  const youtubeId = extractYouTubeId(videoPath);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastReportedTime = useRef<number>(0); // Track progress reporting

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);

  const videoUrl = videoPath.startsWith("http")
    ? videoPath
    : `http://localhost:8000/${videoPath}`;

  /* ---------------- setup source ---------------- */
  
  useEffect(() => {
    if (youtubeId) return;

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    setIsReady(false);
    lastReportedTime.current = 0; // Reset tracking on new video

    const onCanPlay = () => setIsReady(true);

    video.addEventListener("canplay", onCanPlay);

    if (videoPath.endsWith(".m3u8")) {
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoUrl; // Safari
      }
    } else {
      video.src = videoUrl; // MP4
    }

    return () => {
      video.pause();
      video.removeEventListener("canplay", onCanPlay);
      hls?.destroy();
    };
  }, [videoPath, videoUrl, youtubeId]);

  /* ---------------- progress + view + history ---------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      if (!video.duration) return;

      const currentTime = video.currentTime;
      const p = (currentTime / video.duration) * 100;
      setProgress(p);

      // 1. Instant View Logic (triggers once as requested)
      if (!hasViewed) {
        setHasViewed(true);
        onView?.();
      }

      // 2. Throttled History Logic (report every 5 seconds of playback)
      if (onProgress && Math.abs(currentTime - lastReportedTime.current) > 5) {
        onProgress(currentTime);
        lastReportedTime.current = currentTime;
      }
    };

    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [hasViewed, onView, onProgress]);

  /* ---------------- controls ---------------- */

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v || !isReady) return;

    if (v.paused) {
      try {
        await v.play();
        setIsPlaying(true);
      } catch {
        /* ignored */
      }
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleSeek = ([val]: number[]) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const targetTime = (val / 100) * v.duration;
    v.currentTime = targetTime;
    setProgress(val);
    
    // Force a progress report immediately on seek
    if (onProgress) {
        onProgress(targetTime);
        lastReportedTime.current = targetTime;
    }
  };

  const handleVolume = ([val]: number[]) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  /* ---------------- YouTube ---------------- */

  if (youtubeId) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  /* ---------------- player ---------------- */

  return (
    <div
      ref={containerRef}
      className="group relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Overlay Controls */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end transition-opacity duration-300",
          isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100",
          "bg-gradient-to-t from-black/80 via-transparent to-transparent"
        )}
      >
        <div className="px-4">
          <Slider 
            value={[progress]} 
            onValueChange={handleSeek} 
            max={100} 
            step={0.1}
            className="cursor-pointer"
          />
        </div>

        <div className="flex justify-between items-center px-4 pb-3">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={togglePlay} className="text-white hover:bg-white/20">
              {isPlaying ? <Pause className="fill-white" /> : <Play className="fill-white" />}
            </Button>

            <div className="flex items-center gap-2 group/volume">
                <Button size="icon" variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20">
                {isMuted ? <VolumeX /> : <Volume2 />}
                </Button>
                <Slider
                className="w-0 group-hover/volume:w-24 transition-all duration-300 overflow-hidden"
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolume}
                />
            </div>
          </div>

          <Button size="icon" variant="ghost" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>

      {/* Large Center Play Button */}
      {!isPlaying && isReady && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/20"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center scale-100 hover:scale-110 transition-transform cursor-pointer shadow-glow">
            <Play className="w-8 h-8 text-primary-foreground ml-1 fill-current" />
          </div>
        </div>
      )}
    </div>
  );
};