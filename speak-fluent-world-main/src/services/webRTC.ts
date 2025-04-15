
// This implements WebRTC for real-time communication between two peers
// Uses a simple signaling mechanism for demo purposes

export interface PeerConnectionConfig {
  iceServers: RTCIceServer[];
}

export class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteVideo: HTMLVideoElement | null = null;
  private localVideo: HTMLVideoElement | null = null;
  private isInitiator: boolean = false;
  private onConnectedCallback: (() => void) | null = null;
  private onDisconnectedCallback: (() => void) | null = null;
  private roomId: string | null = null;
  private userId: string;
  private isConnected: boolean = false;
  private connectionTimeout: number | null = null;

  // For real world applications, this would be a real WebSocket connection
  private socket: any = null;
  private signalHistory: any[] = [];
  
  // Store remote session description for latecomers
  private remoteSessionDescription: RTCSessionDescriptionInit | null = null;

  private config: PeerConnectionConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      {
        urls: 'turn:numb.viagenie.ca',
        username: 'webrtc@live.com',
        credential: 'muazkh'
      }
    ]
  };

  constructor() {
    // Generate a random user ID for this session
    this.userId = Math.floor(Math.random() * 1000000).toString();
    
    // Simple emulation of signaling server (in a real app, this would be a WebSocket connection)
    this.setupSocketEmulation();
  }
  
  // Emulate a signaling server using localStorage for demo purposes
  // In a real app, this would be a WebSocket or similar
  private setupSocketEmulation() {
    this.socket = {
      send: (message: any) => {
        // Store in local storage with timestamp
        const timestamp = Date.now();
        const storageKey = `webrtc_signal_${this.roomId}_${timestamp}`;
        const data = JSON.stringify({
          time: timestamp,
          message: message,
          roomId: this.roomId
        });
        
        localStorage.setItem(storageKey, data);
        this.signalHistory.push(storageKey);
        
        // Clean up older messages to not fill storage
        if (this.signalHistory.length > 50) {
          const oldKey = this.signalHistory.shift();
          if (oldKey) localStorage.removeItem(oldKey);
        }
        
        // Log for debugging
        console.log(`Signal sent: ${message.type} for room ${this.roomId}`);
      },
      
      // Periodically check for new messages
      setupListener: (roomId: string, callback: (message: any) => void) => {
        // Clean up any existing messages for this room that are older than 30 minutes
        this.cleanupOldSignalingMessages(roomId);
        
        const checkInterval = setInterval(() => {
          // Get all keys that match our room pattern
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`webrtc_signal_${roomId}`)) {
              keys.push(key);
            }
          }
          
          // Process all messages we haven't seen yet
          keys.sort().forEach(key => {
            if (!this.signalHistory.includes(key)) {
              const data = localStorage.getItem(key);
              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.roomId === roomId) {
                    console.log(`Received signal: ${parsed.message.type} for room ${roomId}`);
                    callback(parsed.message);
                    this.signalHistory.push(key);
                  }
                } catch (e) {
                  console.error('Error parsing signal data', e);
                }
              }
            }
          });
        }, 1000); // Check every second
        
        return () => {
          clearInterval(checkInterval);
        };
      }
    };
  }
  
  // Clean up old signaling messages to prevent problems with stale data
  private cleanupOldSignalingMessages(roomId: string) {
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`webrtc_signal_${roomId}`)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.time < thirtyMinutesAgo) {
              localStorage.removeItem(key);
              console.log(`Removed old signal message: ${key}`);
            }
          } catch (e) {
            // Remove invalid entries
            localStorage.removeItem(key);
          }
        }
      }
    }
  }

  public async initialize(
    localVideo: HTMLVideoElement, 
    remoteVideo: HTMLVideoElement,
    isInitiator: boolean,
    onConnected?: () => void,
    onDisconnected?: () => void,
    roomId?: string
  ): Promise<void> {
    this.localVideo = localVideo;
    this.remoteVideo = remoteVideo;
    this.isInitiator = isInitiator;
    this.onConnectedCallback = onConnected || null;
    this.onDisconnectedCallback = onDisconnected || null;
    this.roomId = roomId || Math.floor(Math.random() * 1000000).toString();

    try {
      // If localVideo already has a srcObject, use that instead of creating a new one
      if (this.localVideo.srcObject instanceof MediaStream) {
        this.localStream = this.localVideo.srcObject;
        console.log("Using existing stream from video element");
      } else {
        // Get a new media stream
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          if (this.localVideo) {
            this.localVideo.srcObject = this.localStream;
          }
        } catch (e) {
          console.warn('Could not access real camera, using mock stream', e);
          this.localStream = await this.getMockMediaStream();
          if (this.localVideo) {
            this.localVideo.srcObject = this.localStream;
          }
        }
      }
      
      // Create and set up the peer connection
      this.createPeerConnection();
      
      // Set up signaling for this room
      if (this.socket) {
        this.socket.setupListener(this.roomId!, this.handleSignalingMessage.bind(this));
      }
      
      // Set a timeout to end the connection attempt if no connection is established
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
      
      this.connectionTimeout = window.setTimeout(() => {
        if (!this.isConnected) {
          console.log("Connection timeout - no peer responded");
          if (this.onDisconnectedCallback) {
            this.onDisconnectedCallback();
          }
        }
      }, 30000); // 30 second timeout
      
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  }

  private handleSignalingMessage(message: any): void {
    if (!this.peerConnection) {
      console.warn('Received signaling message but peer connection not initialized');
      return;
    }
    
    console.log('Received signaling message:', message.type);
    
    switch (message.type) {
      case 'offer':
        this.handleOffer(message.offer);
        break;
      case 'answer':
        this.handleAnswer(message.answer);
        break;
      case 'candidate':
        this.handleCandidate(message.candidate);
        break;
      case 'disconnect':
        this.handleDisconnect();
        break;
    }
  }

  private createPeerConnection(): void {
    try {
      this.peerConnection = new RTCPeerConnection(this.config);
      
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Generated ICE candidate');
          if (this.socket) {
            this.socket.send({
              type: 'candidate',
              candidate: event.candidate
            });
          }
        }
      };
      
      this.peerConnection.ontrack = (event) => {
        if (this.remoteVideo && event.streams && event.streams[0]) {
          console.log('Received remote stream');
          this.remoteVideo.srcObject = event.streams[0];
          
          // Set connected state and call callback
          if (!this.isConnected && this.onConnectedCallback) {
            this.isConnected = true;
            
            // Clear connection timeout
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout);
              this.connectionTimeout = null;
            }
            
            this.onConnectedCallback();
          }
        }
      };
      
      this.peerConnection.onconnectionstatechange = () => {
        console.log("Connection state:", this.peerConnection?.connectionState);
        
        if (this.peerConnection?.connectionState === 'connected') {
          console.log("WebRTC connection established successfully");
          this.isConnected = true;
          
          // Clear connection timeout
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          if (this.onConnectedCallback) {
            this.onConnectedCallback();
          }
        } else if (this.peerConnection?.connectionState === 'disconnected' || 
            this.peerConnection?.connectionState === 'failed' ||
            this.peerConnection?.connectionState === 'closed') {
          this.handleDisconnect();
        }
      };
      
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", this.peerConnection?.iceConnectionState);
        
        if (this.peerConnection?.iceConnectionState === 'disconnected' || 
            this.peerConnection?.iceConnectionState === 'failed' ||
            this.peerConnection?.iceConnectionState === 'closed') {
          this.handleDisconnect();
        }
      };
      
      // Add local stream tracks to the connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
        console.log('Added local stream to peer connection');
      }
      
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      throw error;
    }
  }

  private handleDisconnect(): void {
    if (!this.isConnected) return;
    
    this.isConnected = false;
    console.log("Disconnected from peer");
    
    // Clear connection timeout if it exists
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.onDisconnectedCallback) {
      this.onDisconnectedCallback();
    }
  }

  private async createOffer(): Promise<void> {
    if (!this.peerConnection) {
      console.error("Cannot create offer - no peer connection");
      return;
    }
    
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('Created and set local offer', offer);
      
      // Send this offer to the other peer via signaling
      if (this.socket) {
        this.socket.send({
          type: 'offer',
          offer: offer
        });
      }
      
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      console.error("Cannot handle offer - no peer connection");
      return;
    }
    
    try {
      // Store the remote session description
      this.remoteSessionDescription = offer;
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Set remote description from offer');
      
      // Create and send an answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('Created and set local answer');
      
      // Send this answer to the other peer via signaling
      if (this.socket) {
        this.socket.send({
          type: 'answer',
          answer: answer
        });
      }
      
    } catch (error) {
      console.error('Failed to handle offer:', error);
      throw error;
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      console.error("Cannot handle answer - no peer connection");
      return;
    }
    
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Set remote description from answer');
      
    } catch (error) {
      console.error('Failed to handle answer:', error);
      throw error;
    }
  }

  private async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      console.error("Cannot add ICE candidate - no peer connection");
      return;
    }
    
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('Added ICE candidate');
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  private async getMockMediaStream(): Promise<MediaStream> {
    try {
      // Create a mock video stream with a colored canvas
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some text
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Local Camera', canvas.width / 2, canvas.height / 2);
        
        // Draw continuously to simulate video
        setInterval(() => {
          if (ctx) {
            // Update timestamp to create animation
            ctx.fillStyle = '#3498db';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Local Camera', canvas.width / 2, canvas.height / 2);
            ctx.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 40);
          }
        }, 1000);
      }
      
      // @ts-ignore - TypeScript doesn't recognize captureStream on canvas
      const stream = canvas.captureStream(30);
      
      // Add silent audio track to the mock stream
      try {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Set the gain to almost 0 to make it silent
        gainNode.gain.value = 0.01;
        
        oscillator.connect(gainNode);
        const dst = audioContext.createMediaStreamDestination();
        gainNode.connect(dst);
        oscillator.start();
        const audioTrack = dst.stream.getAudioTracks()[0];
        stream.addTrack(audioTrack);
      } catch (audioError) {
        console.warn('Could not add mock audio track', audioError);
      }
      
      return stream;
    } catch (e) {
      console.error('Failed to create mock media stream:', e);
      throw e;
    }
  }

  public async call(): Promise<void> {
    console.log('Initiating call...');
    if (this.isInitiator) {
      console.log('Creating offer as initiator');
      await this.createOffer();
    }
  }

  public joinRoom(roomId: string): void {
    this.roomId = roomId;
    console.log(`Joining room: ${roomId}`);
    this.isInitiator = false;
    
    // Check if there are existing offers in this room and send a ping
    console.log("Waiting for connection to be established...");
    
    // Send a special "ping" message to let others know we want to join
    if (this.socket) {
      this.socket.send({
        type: 'ping',
        message: 'Looking to connect'
      });
    }
  }

  public createRoom(): string {
    const roomId = Math.floor(Math.random() * 1000000).toString();
    this.roomId = roomId;
    console.log(`Created room: ${roomId}`);
    this.isInitiator = true;
    
    return roomId;
  }

  public hangUp(): void {
    // Clear connection timeout if it exists
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Notify other peer via signaling
    if (this.socket && this.roomId) {
      this.socket.send({
        type: 'disconnect'
      });
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop all media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clear video elements
    if (this.localVideo) {
      this.localVideo.srcObject = null;
    }
    
    if (this.remoteVideo) {
      this.remoteVideo.srcObject = null;
    }
    
    // Remove all signaling messages for this room from localStorage
    this.cleanupSignalingMessages();
    
    // Reset connection state
    this.isConnected = false;
    
    // Call the disconnected callback
    if (this.onDisconnectedCallback) {
      this.onDisconnectedCallback();
    }
  }
  
  private cleanupSignalingMessages(): void {
    // Remove all stored signaling messages for this room
    if (!this.roomId) return;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`webrtc_signal_${this.roomId}`)) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear our history
    this.signalHistory = [];
  }

  public toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`Audio track ${track.label} enabled: ${enabled}`);
      });
    }
  }

  public toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`Video track ${track.label} enabled: ${enabled}`);
      });
    }
  }

  public getRoomId(): string | null {
    return this.roomId;
  }
}
