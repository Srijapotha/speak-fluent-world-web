
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Globe } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import { cn } from "@/lib/utils";
import { languages } from "@/data/languages";
import { toast } from "sonner";

interface TranslationControlsProps {
  sourceLanguage: string;
  targetLanguage: string;
  isTranslating: boolean;
  isCallActive: boolean;
  onToggleTranslation: () => void;
  onChangeSourceLanguage: (language: string) => void;
  onChangeTargetLanguage: (language: string) => void;
}

const TranslationControls = ({
  sourceLanguage,
  targetLanguage,
  isTranslating,
  isCallActive,
  onToggleTranslation,
  onChangeSourceLanguage,
  onChangeTargetLanguage
}: TranslationControlsProps) => {
  const [pulseClass, setPulseClass] = useState("");

  useEffect(() => {
    setPulseClass(isTranslating ? "animate-pulse-recording" : "");
    
    // Log the translation state for debugging
    console.log("Translation state:", { 
      isTranslating, 
      sourceLanguage, 
      targetLanguage,
      isCallActive 
    });
  }, [isTranslating, sourceLanguage, targetLanguage, isCallActive]);

  // Helper function to get the correct flag path
  const getFlagPath = (code: string): string => {
    // Special cases for specific languages
    if (code === 'en') return '/flags/gb.svg';
    if (code === 'zh') return '/flags/cn.svg';
    if (code === 'ja') return '/flags/jp.svg';
    if (code === 'ko') return '/flags/kr.svg';
    if (code === 'ar') return '/flags/ar.svg';
    if (code === 'ur') return '/flags/ur.svg';
    
    // For all other languages, try direct match first
    return `/flags/${code}.svg`;
  };

  // Get language name from code
  const getLanguageName = (code: string): string => {
    const language = languages.find(lang => lang.code === code);
    return language?.name || code.toUpperCase();
  };

  // Handle flag load error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null;
    console.warn(`Flag for ${target.alt} not found`);
    target.src = "/placeholder.svg";
  };
  
  // Handle translation toggle with proper feedback
  const handleToggleTranslation = () => {
    if (!isCallActive) {
      toast.error("Please start a call before enabling translation");
      return;
    }
    
    onToggleTranslation();
    
    if (!isTranslating) {
      toast.success(`Starting translation: ${getLanguageName(sourceLanguage)} → ${getLanguageName(targetLanguage)}`);
    } else {
      toast.info("Stopping translation");
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 space-y-5 shadow-md border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img 
              src={getFlagPath(sourceLanguage)} 
              alt={getLanguageName(sourceLanguage)} 
              className="w-9 h-7 rounded shadow-sm object-cover"
              onError={handleImageError}
            />
          </div>
          <span className="text-sm font-medium">→</span>
          <div className="relative">
            <img 
              src={getFlagPath(targetLanguage)} 
              alt={getLanguageName(targetLanguage)} 
              className="w-9 h-7 rounded shadow-sm object-cover"
              onError={handleImageError}
            />
          </div>
        </div>
        <div className="text-sm font-semibold px-3 py-1.5 bg-gray-100 rounded-full">
          {getLanguageName(sourceLanguage)} → {getLanguageName(targetLanguage)}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <div className="space-y-2">
          <label className="text-xs text-gray-600 font-medium flex items-center">
            <Globe className="h-3 w-3 mr-1" />
            Your language
          </label>
          <LanguageSelector
            label="Your language"
            value={sourceLanguage}
            onChange={onChangeSourceLanguage}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs text-gray-600 font-medium flex items-center">
            <Globe className="h-3 w-3 mr-1" />
            Translate to
          </label>
          <LanguageSelector
            label="Translate to"
            value={targetLanguage}
            onChange={onChangeTargetLanguage}
            className="w-full"
          />
        </div>
      </div>
      
      <Button
        onClick={handleToggleTranslation}
        disabled={!isCallActive}
        className={cn(
          "w-full gap-2 mt-1 rounded-lg shadow-sm transition-all duration-200",
          isTranslating 
            ? "bg-amber-500 hover:bg-amber-600 text-white" 
            : "bg-emerald-500 hover:bg-emerald-600 text-white",
          pulseClass
        )}
      >
        {isTranslating ? (
          <>
            <MicOff className="h-4 w-4" />
            Stop Translation
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Start Translation
          </>
        )}
      </Button>
      
      {!isCallActive && (
        <p className="text-xs text-gray-500 text-center mt-1 bg-gray-50 p-2 rounded-md border border-gray-100">
          Start a call to enable translation
        </p>
      )}
    </div>
  );
};

export default TranslationControls;
