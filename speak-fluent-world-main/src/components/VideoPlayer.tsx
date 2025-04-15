
import { useRef, useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff, User, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  isLocal: boolean;
  muted?: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  stream?: MediaStream | null;
  languageCode?: string;
  isConnecting?: boolean;
}

const VideoPlayer = ({
  isLocal,
  muted = false,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  videoRef: externalVideoRef,
  stream,
  languageCode = "en",
  isConnecting = false
}: VideoPlayerProps) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRefToUse = externalVideoRef || internalVideoRef;
  const [hasVideoTracks, setHasVideoTracks] = useState(false);

  // Handle the stream when it's provided
  useEffect(() => {
    const videoElement = videoRefToUse.current;
    if (videoElement && stream) {
      videoElement.srcObject = stream;
      
      // Check if the stream has video tracks
      const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
      setHasVideoTracks(hasVideo);
      
      console.log(`Stream connected with ${stream.getTracks().length} tracks. Video tracks: ${stream.getVideoTracks().length}`);
    } else {
      setHasVideoTracks(false);
    }
    
    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [stream, videoRefToUse]);

  // Monitor video tracks enable/disable status
  useEffect(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        setHasVideoTracks(videoTracks[0].enabled && videoEnabled);
      }
    }
  }, [stream, videoEnabled]);

  // Get flag URL by language code
  const getFlagUrl = (code: string) => {
    // Special case for English (uses GB flag)
    if (code === 'en') return "/flags/gb.svg";
    return `/flags/${code}.svg`;
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl">
      <div className={cn(
        "overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 aspect-video w-full relative",
        !videoEnabled && "bg-gradient-to-br from-slate-800 to-slate-900"
      )}>
        <video
          ref={videoRefToUse}
          autoPlay
          playsInline
          muted={muted}
          onLoadedMetadata={() => console.log("Video metadata loaded")}
          onPlay={() => console.log("Video started playing")}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            (!videoEnabled || !hasVideoTracks) ? 'opacity-0' : 'opacity-100'
          )}
        />
        
        {/* Show connecting state */}
        {isConnecting && !isLocal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/40 z-10">
            <div className="bg-blue-600/40 p-6 rounded-full">
              <Loader className="w-12 h-12 animate-spin text-blue-100" />
            </div>
            <p className="mt-4 text-lg font-medium text-blue-100">Connecting...</p>
            <p className="text-sm text-blue-200 mt-2">Waiting for peer to join</p>
          </div>
        )}
        
        {/* Show when video is off or no stream */}
        {(!videoEnabled || !hasVideoTracks) && !isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="bg-gray-700/60 p-4 rounded-full">
              <User className="w-12 h-12 opacity-70" />
            </div>
            <p className="mt-3 text-sm text-gray-300 font-medium">
              {!isLocal && !stream ? "Waiting for video..." : "Video off"}
            </p>
          </div>
        )}
        
        {/* Top-left flag */}
        <div className="absolute top-4 left-4 w-16 h-10 overflow-hidden rounded-md shadow-md border border-white/20">
          <img src={getFlagUrl(languageCode)} alt={`${languageCode} flag`} className="w-full h-full object-cover" />
        </div>
        
        {/* Bottom flag in a circle */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full overflow-hidden shadow-lg border-2 border-white">
          <img src={getFlagUrl(languageCode)} alt={`${languageCode} flag`} className="w-full h-full object-cover" />
        </div>
      </div>
      
      {isLocal && (
        <div className="absolute bottom-28 right-3 flex space-x-2">
          <Button
            size="icon"
            variant={audioEnabled ? "outline" : "destructive"}
            className={cn(
              "rounded-full h-10 w-10 backdrop-blur-lg border shadow-lg",
              audioEnabled 
                ? "bg-white/20 hover:bg-white/30 border-white/30 text-white" 
                : "bg-red-500/90 hover:bg-red-600/90 border-red-400/30"
            )}
            onClick={onToggleAudio}
          >
            {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant={videoEnabled ? "outline" : "destructive"}
            className={cn(
              "rounded-full h-10 w-10 backdrop-blur-lg border shadow-lg",
              videoEnabled 
                ? "bg-white/20 hover:bg-white/30 border-white/30 text-white" 
                : "bg-red-500/90 hover:bg-red-600/90 border-red-400/30"
            )}
            onClick={onToggleVideo}
          >
            {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
