
import { Button } from "@/components/ui/button";
import { PhoneOff, Phone, UserPlus, Users, Copy, Check, Loader, WifiOff, X, LogOut, RefreshCcw, Percent, Link, Share2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DiscountButton from "@/components/DiscountButton";

interface CallControlsProps {
  isCallActive: boolean;
  isConnecting: boolean;
  roomId: string | null;
  onStartCall: () => void;
  onEndCall: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

const CallControls = ({
  isCallActive,
  isConnecting,
  roomId,
  onStartCall,
  onEndCall,
  onCreateRoom,
  onJoinRoom
}: CallControlsProps) => {
  const isMobile = useIsMobile();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Auto-parse room ID from clipboard if available when joining
  useEffect(() => {
    if (showJoinInput) {
      navigator.clipboard.readText()
        .then(text => {
          // Check if text is a room ID (digits only) or a meeting link
          if (/^\d+$/.test(text.trim())) {
            setJoinRoomId(text.trim());
            toast.info("Room ID pasted from clipboard");
          } else if (text.includes("?room=")) {
            // Extract room ID from meeting link
            const match = text.match(/[?&]room=(\d+)/);
            if (match && match[1]) {
              setJoinRoomId(match[1]);
              toast.info("Meeting link detected and parsed");
            }
          }
        })
        .catch(() => {
          // Clipboard access denied - ignore silently
        });
    }
  }, [showJoinInput]);
  
  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      toast.error("Please enter a room ID to join");
      return;
    }
    
    // Clean the room ID - remove any non-digit characters
    const cleanedRoomId = joinRoomId.trim().replace(/\D/g, '');
    
    if (cleanedRoomId !== joinRoomId.trim()) {
      toast.info("Room ID cleaned - removed non-digit characters");
    }
    
    if (!cleanedRoomId) {
      toast.error("Invalid room ID format - must contain numbers");
      return;
    }
    
    onJoinRoom(cleanedRoomId);
    setJoinRoomId("");
    setShowJoinInput(false);
    toast.loading(`Joining room ${cleanedRoomId}...`);
  };
  
  const handleCopyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      toast.success("Room ID copied to clipboard! Share with someone to join");
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };
  
  // For Google Meet/Teams style meeting link
  const getMeetingLink = () => {
    if (!roomId) return "";
    return `${window.location.origin}?room=${roomId}`;
  };
  
  // Copy the full meeting URL
  const handleCopyMeetingLink = () => {
    if (roomId) {
      const meetingLink = getMeetingLink();
      navigator.clipboard.writeText(meetingLink);
      setCopiedLink(true);
      toast.success("Meeting link copied to clipboard!");
      
      setTimeout(() => {
        setCopiedLink(false);
      }, 2000);
    }
  };
  
  // Share meeting function (like Google Meet)
  const handleShareMeeting = () => {
    if (!roomId) return;
    
    const meetingLink = getMeetingLink();
    
    if (navigator.share) {
      navigator.share({
        title: 'Join my LingoConnect meeting',
        text: `Join my video call with room ID: ${roomId}`,
        url: meetingLink
      }).then(() => {
        toast.success("Meeting invitation shared!");
      }).catch(() => {
        // Fallback to clipboard if share API fails or is cancelled
        handleCopyMeetingLink();
      });
    } else {
      // Fallback for browsers that don't support sharing
      handleCopyMeetingLink();
    }
  };
  
  const handleTryAgain = () => {
    if (roomId) {
      toast.info("Retrying connection...");
      onEndCall();
      setTimeout(() => {
        onJoinRoom(roomId);
      }, 1000);
    }
  };
  
  // Check URL for room parameter on component mount
  useEffect(() => {
    if (!isCallActive && !isConnecting) {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      
      if (roomParam) {
        setJoinRoomId(roomParam);
        setShowJoinInput(true);
        toast.info(`Room ID ${roomParam} detected in URL`);
      }
    }
  }, [isCallActive, isConnecting]);
  
  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Connection status indicator with cancel option when connecting */}
      {isConnecting && (
        <div className="flex flex-col items-center justify-center space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-100 w-full max-w-md">
          <div className="flex items-center justify-center space-x-2 animate-pulse">
            <Loader className="h-5 w-5 text-blue-500 animate-spin" />
            <span className="text-sm font-medium text-blue-700">Establishing connection...</span>
          </div>
          
          <p className="text-xs text-center text-blue-600">
            Connecting to peer. This may take a moment...
          </p>
          
          {/* Cancel connection button */}
          <Button 
            onClick={() => {
              // Force immediate cancellation and cleanup
              onEndCall();
              toast.error("Connection attempt canceled");
              
              // Clear room ID from URL if present
              if (window.location.search.includes('room=')) {
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
              }
            }}
            variant="destructive"
            size="sm"
            className="flex items-center gap-1 bg-red-500 hover:bg-red-600"
          >
            <X className="h-4 w-4" />
            Cancel Connection
          </Button>
        </div>
      )}
      
      {/* Disconnection warning */}
      {!isCallActive && !isConnecting && roomId && (
        <div className="flex flex-col items-center space-y-3 bg-red-50 p-4 rounded-lg border border-red-100 w-full max-w-md">
          <div className="flex items-center justify-center space-x-2 text-red-500 mb-2">
            <WifiOff className="h-5 w-5" />
            <span className="text-sm font-medium">Connection lost or ended</span>
          </div>
          
          {/* Room reconnection options */}
          <div className="flex gap-2">
            <Button
              onClick={handleTryAgain}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
            
            <Button
              onClick={() => {
                if (roomId) {
                  setJoinRoomId(roomId);
                  setShowJoinInput(true);
                }
              }}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1"
            >
              <Users className="h-4 w-4 mr-1" />
              Rejoin Room
            </Button>
          </div>
        </div>
      )}
      
      {/* Enhanced Meeting Room Info Display - Google Meet Style */}
      {isCallActive && roomId && (
        <div className="bg-white px-4 py-3 rounded-lg text-sm w-full max-w-md shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-blue-500" />
              <span className="font-medium">Meeting info</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2"
              onClick={handleShareMeeting}
              title="Share meeting"
            >
              <Share2 className="h-3.5 w-3.5 text-blue-500" />
            </Button>
          </div>
          
          {/* Room ID display with copy button */}
          <div className="bg-gray-50 p-2 rounded border border-gray-200 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Room ID</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-1"
                onClick={handleCopyRoomId}
                title="Copy room ID"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <div className="font-bold text-blue-600">{roomId}</div>
          </div>
          
          {/* Meeting link display with copy button */}
          <div className="bg-gray-50 p-2 rounded border border-gray-200 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Meeting link</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-1"
                onClick={handleCopyMeetingLink}
                title="Copy meeting link"
              >
                {copiedLink ? <Check className="h-3 w-3" /> : <Link className="h-3 w-3" />}
              </Button>
            </div>
            <div className="text-xs text-gray-700 truncate font-mono">{getMeetingLink()}</div>
          </div>
          
          {/* Meeting control buttons */}
          <div className="flex gap-2 justify-between">
            <Button
              className="flex items-center justify-center text-xs bg-blue-500 hover:bg-blue-600 w-full"
              size="sm"
              onClick={handleShareMeeting}
            >
              <Share2 className="h-3 w-3 mr-1" />
              Share invitation
            </Button>
            
            <Button
              className="flex items-center justify-center text-xs bg-red-500 hover:bg-red-600 w-full"
              size="sm"
              onClick={onEndCall}
              title="Disconnect from call"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Leave meeting
            </Button>
          </div>
        </div>
      )}
      
      {!isCallActive && !isConnecting ? (
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          {!showJoinInput ? (
            <>
              <Button
                onClick={onCreateRoom}
                disabled={isConnecting}
                className={cn(
                  "bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-lg px-6 shadow-md",
                  isMobile ? "py-2" : "py-6 text-lg"
                )}
                size={isMobile ? "default" : "lg"}
              >
                <UserPlus className={cn("mr-1", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                Start new meeting
              </Button>
              
              <Button
                onClick={() => setShowJoinInput(true)}
                disabled={isConnecting}
                className={cn(
                  "bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-lg px-6 shadow-md",
                  isMobile ? "py-2" : "py-6 text-lg"
                )}
                size={isMobile ? "default" : "lg"}
              >
                <Users className={cn("mr-1", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                Join meeting
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-3 w-full max-w-md">
              <div className="flex gap-2 w-full">
                <Input 
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Enter room ID or meeting link"
                  className="rounded-l-lg"
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  autoFocus
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!joinRoomId.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Join
                </Button>
                <Button
                  onClick={() => {
                    setShowJoinInput(false);
                    setJoinRoomId("");
                    
                    // Clear room from URL if present
                    if (window.location.search.includes('room=')) {
                      const cleanUrl = window.location.pathname;
                      window.history.replaceState({}, document.title, cleanUrl);
                    }
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Enter a room ID or paste a meeting link to join
              </div>
            </div>
          )}
        </div>
      ) : (
        !isConnecting && (
          <div className="w-full flex justify-center gap-4 mt-2">
            {/* Discount button during active calls */}
            {isCallActive && <DiscountButton />}
            
            <Button
              onClick={onEndCall}
              className="bg-red-600 hover:bg-red-700 text-white gap-2 rounded-lg px-6 shadow-md transition-all"
              size={isMobile ? "default" : "lg"}
            >
              <PhoneOff className={cn("mr-1", isMobile ? "h-4 w-4" : "h-5 w-5")} />
              End Call
            </Button>
          </div>
        )
      )}
      
      {/* Instructions on how to connect - Google Meet style */}
      {!isCallActive && !isConnecting && !showJoinInput && (
        <div className="mt-4 text-sm text-gray-600 max-w-md text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-medium mb-2">To connect with others:</p>
          <ol className="text-left list-decimal pl-5 mt-1 space-y-2">
            <li>Click "Start new meeting" to create a room</li>
            <li>Copy and share the meeting info with others</li>
            <li>Others can join by clicking "Join meeting" and entering the Room ID</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default CallControls;
