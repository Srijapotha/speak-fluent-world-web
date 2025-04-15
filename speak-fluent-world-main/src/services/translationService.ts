
// This is a mock implementation - in a real app this would connect to Google Translate API

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export class TranslationService {
  // Mock translation with some basic translations for demo purposes
  private mockTranslations: Record<string, Record<string, string>> = {
    en: {
      hello: 'hello',
      'how are you': 'how are you',
      'my name is': 'my name is',
      'nice to meet you': 'nice to meet you',
      goodbye: 'goodbye'
    },
    es: {
      hello: 'hola',
      'how are you': 'cómo estás',
      'my name is': 'me llamo',
      'nice to meet you': 'encantado de conocerte',
      goodbye: 'adiós'
    },
    fr: {
      hello: 'bonjour',
      'how are you': 'comment ça va',
      'my name is': 'je m\'appelle',
      'nice to meet you': 'enchanté de faire votre connaissance',
      goodbye: 'au revoir'
    },
    de: {
      hello: 'hallo',
      'how are you': 'wie geht es dir',
      'my name is': 'ich heiße',
      'nice to meet you': 'schön dich kennenzulernen',
      goodbye: 'auf wiedersehen'
    }
  };

  public async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    // This is where you would call the Google Translate API
    // For now, we'll use a mock implementation
    
    return new Promise((resolve) => {
      setTimeout(() => {
        let translatedText = text;
        
        // If we have a mock translation for this phrase in this language
        const lowerText = text.toLowerCase();
        const sourceLang = sourceLanguage.substring(0, 2);
        const targetLang = targetLanguage.substring(0, 2);

        // Check if we have any mock translations for this text
        let foundTranslation = false;
        
        Object.keys(this.mockTranslations[sourceLang] || {}).forEach(key => {
          if (lowerText.includes(key)) {
            const replacement = this.mockTranslations[targetLang]?.[key];
            if (replacement) {
              translatedText = translatedText.replace(
                new RegExp(key, 'i'), 
                replacement
              );
              foundTranslation = true;
            }
          }
        });

        // If no specific phrase was found, add a prefix to show it's "translated"
        if (!foundTranslation) {
          translatedText = `[${targetLang}] ${text}`;
        }

        resolve({
          originalText: text,
          translatedText,
          sourceLanguage,
          targetLanguage
        });
      }, 500); // Simulate API delay
    });
  }
}
