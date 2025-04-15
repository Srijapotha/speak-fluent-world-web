
// This is a mock implementation - in a real app this would connect to a Text-to-Speech API

export class TextToSpeechService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isReady: boolean = false;
  private initializationPromise: Promise<boolean> | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    // Initialize voices with a more robust approach
    this.initializationPromise = this.initializeVoices();
    
    console.log("TextToSpeechService initialized");
  }

  private async initializeVoices(): Promise<boolean> {
    // First attempt to load voices directly
    this.voices = this.synth.getVoices();
    
    // If no voices are available, wait for the onvoiceschanged event
    if (this.voices.length === 0 && this.synth.onvoiceschanged !== undefined) {
      try {
        await new Promise<void>((resolve) => {
          const voicesChangedHandler = () => {
            this.voices = this.synth.getVoices();
            this.synth.onvoiceschanged = null;
            resolve();
          };
          
          this.synth.onvoiceschanged = voicesChangedHandler;
          
          // Set a timeout in case the event never fires
          setTimeout(() => {
            if (this.voices.length === 0) {
              this.voices = this.synth.getVoices(); // Try one more time
              resolve();
            }
          }, 1000);
        });
      } catch (error) {
        console.error("Error loading voices:", error);
      }
    }
    
    this.isReady = this.voices.length > 0;
    console.log(`Loaded ${this.voices.length} voices for speech synthesis`);
    
    return this.isReady;
  }

  private async ensureVoicesLoaded(): Promise<boolean> {
    if (this.isReady) {
      return true;
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    return this.initializeVoices();
  }

  private getVoiceForLanguage(languageCode: string): SpeechSynthesisVoice | null {
    // Ensure voices are loaded
    if (!this.isReady || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
      this.isReady = this.voices.length > 0;
      console.log(`Reloaded ${this.voices.length} voices on demand`);
    }
    
    // Normalize language code format (e.g., 'en-US' to 'en')
    const normalizedLanguageCode = languageCode.substring(0, 2).toLowerCase();
    
    // Try to find an exact match for the language code
    let voice = this.voices.find(v => v.lang.toLowerCase() === languageCode.toLowerCase());
    
    // If no exact match, try to find a voice that starts with the language code
    if (!voice) {
      voice = this.voices.find(v => v.lang.toLowerCase().startsWith(normalizedLanguageCode));
    }
    
    console.log(`Selected voice for ${languageCode}:`, voice?.name || "Default voice (no match found)");
    
    // If still no match, use the first available voice
    return voice || this.voices[0] || null;
  }

  public async speak(text: string, languageCode: string): Promise<void> {
    if (!this.synth) {
      console.error('Speech synthesis not supported');
      return;
    }
    
    // Ensure voices are loaded before trying to speak
    await this.ensureVoicesLoaded();
    
    console.log(`Speaking in ${languageCode}: "${text}"`);
    
    // Cancel any ongoing speech
    this.synth.cancel();
    
    if (!text) {
      console.warn("Empty text provided to speak");
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getVoiceForLanguage(languageCode);
    
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = languageCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Add event listeners for debugging
    utterance.onstart = () => console.log("Speech started");
    utterance.onend = () => console.log("Speech ended");
    utterance.onerror = (e) => console.error("Speech error:", e);
    
    try {
      this.synth.speak(utterance);
    } catch (error) {
      console.error("Failed to speak:", error);
    }
  }

  public cancel(): void {
    if (this.synth) {
      this.synth.cancel();
      console.log("Speech synthesis canceled");
    }
  }
}
