import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import Header from "@/components/Header";
import VideoPlayer from "@/components/VideoPlayer";
import CallControls from "@/components/CallControls";
import TranslationControls from "@/components/TranslationControls";
import TranscriptionPanel, { TranscriptionMessage } from "@/components/TranscriptionPanel";
import { WebRTCService } from "@/services/webRTC";
import { SpeechRecognitionService } from "@/services/speechRecognition";
import { TranslationService } from "@/services/translationService";
import { TextToSpeechService } from "@/services/textToSpeech";
import { useIsMobile } from "@/hooks/use-mobile";

// Get language name for display
const getLanguageName = (code: string): string => {
  const languages: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    ru: "Russian",
    // Add more as needed
  };
  return languages[code] || code;
};

const Index = () => {
  const isMobile = useIsMobile();
  
  // Video call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  // Translation state
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isTranslating, setIsTranslating] = useState(false);
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);

  // Media stream state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState<number>(0);
  
  // Refs for services
  const webRTCRef = useRef<WebRTCService | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionService | null>(null);
  const translationServiceRef = useRef<TranslationService | null>(null);
  const textToSpeechRef = useRef<TextToSpeechService | null>(null);
  
  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize services
  useEffect(() => {
    if (!webRTCRef.current) {
      webRTCRef.current = new WebRTCService();
    }
    
    if (!translationServiceRef.current) {
      translationServiceRef.current = new TranslationService();
    }
    
    if (!textToSpeechRef.current) {
      textToSpeechRef.current = new TextToSpeechService();
    }
    
    return () => {
      // Cleanup on unmount
      if (webRTCRef.current) {
        webRTCRef.current.hangUp();
      }
      
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      
      if (textToSpeechRef.current) {
        textToSpeechRef.current.cancel();
      }
    };
  }, []);
  
  // Check for room ID in URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    
    if (roomParam && !isCallActive && !isConnecting && connectionAttempt === 0) {
      // If there's a room ID in the URL, auto-join that room after services are initialized
      console.log(`Found room ID in URL: ${roomParam}`);
      setConnectionAttempt(prev => prev + 1);
      
      setTimeout(() => {
        if (webRTCRef.current) {
          handleJoinRoom(roomParam);
        }
      }, 1000); // Small delay to ensure services are initialized
    }
  }, [isCallActive, isConnecting, connectionAttempt]);
  
  // Initialize Speech Recognition when source language changes
  useEffect(() => {
    // Close previous instance if it exists
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsTranslating(false);
    }
    
    // Create new instance with updated language
    speechRecognitionRef.current = new SpeechRecognitionService(
      sourceLanguage,
      handleTranscription
    );
    
    console.log("Speech recognition service initialized with language:", sourceLanguage);
    
    // Start if translation is active
    if (isTranslating && isCallActive) {
      startTranslation();
    }
  }, [sourceLanguage, isCallActive]);
  
  // When target language changes, restart translation if active
  useEffect(() => {
    if (isTranslating && isCallActive) {
      startTranslation();
    }
  }, [targetLanguage]);

  // This effect will monitor the remote video element for a stream
  useEffect(() => {
    if (isCallActive && remoteVideoRef.current) {
      const checkForRemoteStream = () => {
        if (remoteVideoRef.current && 
            remoteVideoRef.current.srcObject instanceof MediaStream) {
          // We have a remote stream!
          const stream = remoteVideoRef.current.srcObject as MediaStream;
          console.log(`Remote stream detected with ${stream.getTracks().length} tracks`);
          setRemoteStream(stream);
        }
      };
      
      // Check immediately and then every second
      checkForRemoteStream();
      const interval = setInterval(checkForRemoteStream, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isCallActive, remoteVideoRef.current]);
  
  const handleCreateRoom = async () => {
    if (!webRTCRef.current) {
      toast.error("WebRTC service not initialized");
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Get user media directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        setLocalStream(stream);
      } catch (e) {
        console.warn('Could not access real camera, using mock stream', e);
        // The WebRTC service will handle fallback to mock stream
      }

      // Create a new room
      const newRoomId = webRTCRef.current.createRoom();
      setRoomId(newRoomId);
      
      // Update URL with room ID for easy sharing
      updateUrlWithRoomId(newRoomId);
      
      // Initialize the WebRTC connection
      await webRTCRef.current.initialize(
        localVideoRef.current!,
        remoteVideoRef.current!,
        true, // initiator
        () => {
          // On connected callback
          setIsCallActive(true);
          setIsConnecting(false);
          
          // Get the remote stream from WebRTC service
          if (remoteVideoRef.current && remoteVideoRef.current.srcObject instanceof MediaStream) {
            setRemoteStream(remoteVideoRef.current.srcObject as MediaStream);
          }
          
          toast.success("Call connected!");
        },
        () => {
          // On disconnected callback
          handleCallDisconnect();
        },
        newRoomId
      );
      
      webRTCRef.current.call();
    } catch (error) {
      console.error("Failed to create room:", error);
      setIsConnecting(false);
      toast.error("Failed to create room. Please try again.");
    }
  };
  
  // Update URL with room ID for easy sharing (Google Meet style)
  const updateUrlWithRoomId = (roomId: string) => {
    if (!roomId) return;
    
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.replaceState({}, '', url);
  };
  
  const handleCallDisconnect = () => {
    setIsCallActive(false);
    setIsTranslating(false);
    setRemoteStream(null);
    
    // Don't reset roomId immediately to allow reconnection
    // setRoomId(null);
    
    // Clean URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    toast.info("Call ended");
  };
  
  const handleJoinRoom = async (roomIdToJoin: string) => {
    if (!webRTCRef.current) {
      toast.error("WebRTC service not initialized");
      return;
    }
    
    setIsConnecting(true);
    setRoomId(roomIdToJoin);
    
    // Update URL with room ID for easy sharing
    updateUrlWithRoomId(roomIdToJoin);
    
    try {
      // Get user media directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        setLocalStream(stream);
      } catch (e) {
        console.warn('Could not access real camera, using mock stream', e);
        // The WebRTC service will handle fallback to mock stream
      }

      // Initialize the WebRTC connection to join an existing room
      await webRTCRef.current.initialize(
        localVideoRef.current!,
        remoteVideoRef.current!,
        false, // not initiator
        () => {
          // On connected callback
          setIsCallActive(true);
          setIsConnecting(false);
          
          // Get the remote stream from WebRTC service
          if (remoteVideoRef.current && remoteVideoRef.current.srcObject instanceof MediaStream) {
            setRemoteStream(remoteVideoRef.current.srcObject as MediaStream);
          }
          
          toast.success("Joined call successfully!");
        },
        () => {
          // On disconnected callback
          handleCallDisconnect();
        },
        roomIdToJoin
      );
      
      webRTCRef.current.joinRoom(roomIdToJoin);
    } catch (error) {
      console.error("Failed to join room:", error);
      setIsConnecting(false);
      
      // Clean URL on error
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      toast.error("Failed to join room. Please check the room ID and try again.");
    }
  };
  
  const handleStartCall = async () => {
    handleCreateRoom();
  };
  
  const handleEndCall = () => {
    if (webRTCRef.current) {
      webRTCRef.current.hangUp();
    }
    
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    
    // Clean URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    setIsCallActive(false);
    setIsConnecting(false);
    setIsTranslating(false);
    setLocalStream(null);
    setRemoteStream(null);
    setRoomId(null);
  };
  
  const handleToggleAudio = () => {
    if (webRTCRef.current) {
      const newState = !audioEnabled;
      webRTCRef.current.toggleAudio(newState);
      setAudioEnabled(newState);
    }
  };
  
  const handleToggleVideo = () => {
    if (webRTCRef.current) {
      const newState = !videoEnabled;
      webRTCRef.current.toggleVideo(newState);
      setVideoEnabled(newState);
    }
  };
  
  const handleToggleTranslation = () => {
    if (!isCallActive) {
      toast.error("Please start a call before enabling translation");
      return;
    }
    
    if (isTranslating) {
      stopTranslation();
    } else {
      startTranslation();
    }
  };
  
  const startTranslation = () => {
    if (speechRecognitionRef.current) {
      try {
        console.log("Starting translation with language:", sourceLanguage);
        speechRecognitionRef.current.setLanguage(sourceLanguage);
        speechRecognitionRef.current.start();
        setIsTranslating(true);
        toast.success(`Translation started: ${getLanguageName(sourceLanguage)} → ${getLanguageName(targetLanguage)}`);
      } catch (error) {
        console.error("Failed to start translation:", error);
        toast.error("Translation failed to start. Please try again.");
        setIsTranslating(false);
      }
    } else {
      console.error("Speech recognition service not initialized");
      toast.error("Speech recognition not available");
      setIsTranslating(false);
    }
  };
  
  const stopTranslation = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        setIsTranslating(false);
        toast.info("Translation stopped");
      } catch (error) {
        console.error("Failed to stop translation:", error);
        toast.error("Failed to stop translation");
      }
    }
  };
  
  const handleTranscription = async (text: string) => {
    if (!translationServiceRef.current || !textToSpeechRef.current) {
      console.error("Translation or text-to-speech service not initialized");
      return;
    }
    
    console.log("Received transcription:", text);
    
    try {
      // Translate the text
      const result = await translationServiceRef.current.translate(
        text,
        sourceLanguage,
        targetLanguage
      );
      
      console.log("Translation result:", result);
      
      // Add to messages
      const newMessage: TranscriptionMessage = {
        id: uuidv4(),
        text: result.originalText,
        translated: result.translatedText,
        timestamp: new Date(),
        isLocal: true
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Speak the translated text
      textToSpeechRef.current.speak(result.translatedText, targetLanguage);
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Translation failed");
    }
  };
  
  const handleSendMessage = async (text: string) => {
    if (!translationServiceRef.current || !textToSpeechRef.current || !isCallActive) {
      toast.error("Please start a call first");
      return;
    }
    
    try {
      // Translate the text
      const result = await translationServiceRef.current.translate(
        text,
        sourceLanguage,
        targetLanguage
      );
      
      // Add to messages
      const newMessage: TranscriptionMessage = {
        id: uuidv4(),
        text: result.originalText,
        translated: result.translatedText,
        timestamp: new Date(),
        isLocal: true
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Speak the translated text
      textToSpeechRef.current.speak(result.translatedText, targetLanguage);
      
      // Simulate a response after a short delay (for demo purposes)
      setTimeout(() => {
        const responseMessage: TranscriptionMessage = {
          id: uuidv4(),
          text: "Thank you for your message",
          translated: "Merci pour votre message",
          timestamp: new Date(),
          isLocal: false
        };
        
        setMessages(prev => [...prev, responseMessage]);
      }, 2000);
      
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Translation failed");
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="video-container">
                  <VideoPlayer
                    isLocal={true}
                    muted={true}
                    audioEnabled={audioEnabled}
                    videoEnabled={videoEnabled}
                    onToggleAudio={handleToggleAudio}
                    onToggleVideo={handleToggleVideo}
                    stream={localStream}
                    videoRef={localVideoRef}
                    languageCode={sourceLanguage}
                  />
                </div>
                <div className="video-container">
                  <VideoPlayer
                    isLocal={false}
                    audioEnabled={true}
                    videoEnabled={true}
                    stream={remoteStream}
                    videoRef={remoteVideoRef}
                    languageCode={targetLanguage}
                    isConnecting={isConnecting && !remoteStream}
                  />
                </div>
              </div>
              
              <CallControls
                isCallActive={isCallActive}
                isConnecting={isConnecting}
                roomId={roomId}
                onStartCall={handleStartCall}
                onEndCall={handleEndCall}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
              />
            </div>
            
            <div className="space-y-6 flex flex-col">
              <TranslationControls
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                isTranslating={isTranslating}
                isCallActive={isCallActive}
                onToggleTranslation={handleToggleTranslation}
                onChangeSourceLanguage={setSourceLanguage}
                onChangeTargetLanguage={setTargetLanguage}
              />
              
              <div className="flex-1">
                <TranscriptionPanel
                  messages={messages}
                  sourceLanguage={getLanguageName(sourceLanguage)}
                  targetLanguage={getLanguageName(targetLanguage)}
                  onSendMessage={handleSendMessage}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-10 text-center">
            <p className="text-xs text-gray-500">
              LingoConnect - Real-time translation enabled video calling
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
