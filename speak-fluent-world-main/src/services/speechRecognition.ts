
// This is a mock implementation since we can't directly access APIs in this environment
// In a real implementation, this would connect to Google Speech Recognition API

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private restartTimeout: number | null = null;
  private language: string;
  private onTranscript: (text: string) => void;

  constructor(language: string, onTranscript: (text: string) => void) {
    this.language = language;
    this.onTranscript = onTranscript;
    this.initRecognition();
    console.log(`SpeechRecognitionService initialized with language: ${language}`);
  }

  private initRecognition() {
    // Browser Speech Recognition API
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition || 
                               null;
    
    if (SpeechRecognitionAPI) {
      try {
        this.recognition = new SpeechRecognitionAPI();
        
        if (this.recognition) {
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = this.language;
          
          console.log(`Speech recognition configured with language: ${this.language}`);

          this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }
            }
            
            if (finalTranscript.trim() !== '') {
              console.log(`Speech recognized: "${finalTranscript}"`);
              this.onTranscript(finalTranscript);
            }
          };

          this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            
            // Attempt to restart recognition after errors
            this.restartRecognition();
          };
          
          this.recognition.onend = () => {
            console.log('Speech recognition service disconnected');
            
            // If we're supposed to be listening but recognition stopped, restart it
            if (this.isListening) {
              this.restartRecognition();
            }
          };
        }
      } catch (e) {
        console.error("Failed to initialize speech recognition:", e);
        this.recognition = null;
      }
    } else {
      console.error('Speech recognition not supported by this browser');
      this.recognition = null;
    }
  }
  
  private restartRecognition() {
    // Only restart if we're supposed to be listening
    if (this.isListening && this.recognition) {
      console.log('Attempting to restart speech recognition...');
      
      // Clear any existing timeout
      if (this.restartTimeout !== null) {
        window.clearTimeout(this.restartTimeout);
      }
      
      // Use a timeout to prevent rapid restart attempts
      this.restartTimeout = window.setTimeout(() => {
        try {
          this.recognition?.start();
          console.log('Speech recognition restarted successfully');
        } catch (error) {
          console.error('Failed to restart speech recognition:', error);
          this.initRecognition(); // Try to re-initialize if restart fails
          
          // Try one more time after re-initialization
          try {
            this.recognition?.start();
            console.log('Speech recognition started after re-initialization');
          } catch (secondError) {
            console.error('Failed to restart speech recognition after re-initialization:', secondError);
          }
        }
      }, 1000);
    }
  }

  public setLanguage(language: string) {
    console.log(`Setting speech recognition language to: ${language}`);
    
    this.language = language;
    
    if (this.recognition) {
      const wasListening = this.isListening;
      
      // Stop current recognition if active
      if (this.isListening) {
        this.stop();
      }
      
      // Re-initialize with new language
      this.initRecognition();
      
      // Restart if it was previously active
      if (wasListening) {
        this.start();
      }
    } else {
      // If recognition wasn't initialized before, try again
      this.initRecognition();
    }
  }

  public start() {
    if (!this.recognition) {
      console.log("Speech recognition not available, trying to initialize...");
      this.initRecognition();
    }
    
    if (this.recognition && !this.isListening) {
      try {
        console.log("Starting speech recognition...");
        this.recognition.start();
        this.isListening = true;
        console.log('Speech recognition started');
      } catch (error) {
        console.error('Speech recognition start error:', error);
        // Try to reinitialize
        this.initRecognition();
        // Try again
        try {
          if (this.recognition) {
            this.recognition.start();
            this.isListening = true;
            console.log('Speech recognition started (second attempt)');
          } else {
            throw new Error("Failed to initialize speech recognition");
          }
        } catch (secondError) {
          console.error('Speech recognition start error (second attempt):', secondError);
          this.isListening = false;
        }
      }
    } else if (this.isListening) {
      console.log("Speech recognition is already active");
    } else {
      console.error("Cannot start speech recognition - not available on this browser");
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
        this.isListening = false;
        console.log('Speech recognition stopped');
        
        // Clear any restart timeout
        if (this.restartTimeout !== null) {
          window.clearTimeout(this.restartTimeout);
          this.restartTimeout = null;
        }
      } catch (error) {
        console.error('Speech recognition stop error:', error);
        this.isListening = false;
      }
    } else {
      console.log("Speech recognition was not active");
      this.isListening = false;
    }
  }

  public isActive() {
    return this.isListening;
  }
}
