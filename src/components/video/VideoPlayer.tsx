import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  videoPath: string;
  onView?: () => void;
}

/* ---------------- utils ---------------- */

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(
    /(?:youtube\.com\/(?:.*v=|v\/|embed\/)|youtu\.be\/)([^"&?/s]{11})/
  );
  return m ? m[1] : null;
};

/* ---------------- component ---------------- */

export const VideoPlayer = ({ videoPath, onView }: VideoPlayerProps) => {
  const youtubeId = extractYouTubeId(videoPath);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  console.log(videoPath)
  useEffect(() => {
    if (youtubeId) return;

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    setIsReady(false);

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

  /* ---------------- progress + view ---------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      if (!video.duration) return;

      const p = (video.currentTime / video.duration) * 100;
      setProgress(p);

      if (!hasViewed && p > 10) {
        setHasViewed(true);
        onView?.();
      }
    };

    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [hasViewed, onView]);

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
    v.currentTime = (val / 100) * v.duration;
    setProgress(val);
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
      <div className="relative w-full aspect-video rounded-xl overflow-hidden">
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
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-video-card"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
      />

      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end",
          "bg-gradient-to-t from-black/70 to-transparent"
        )}
      >
        <div className="px-4">
          <Slider value={[progress]} onValueChange={handleSeek} max={100} />
        </div>

        <div className="flex justify-between items-center px-4 pb-3">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>

            <Button size="icon" variant="ghost" onClick={toggleMute}>
              {isMuted ? <VolumeX /> : <Volume2 />}
            </Button>

            <Slider
              className="w-24"
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolume}
            />
          </div>

          <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>

      {!isPlaying && isReady && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-8 h-8 text-primary-foreground ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};
