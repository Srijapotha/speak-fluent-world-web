
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { languages, Language } from "@/data/languages";

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

const LanguageSelector = ({ value, onChange, label, className = "" }: LanguageSelectorProps) => {
  // Function to get flag image path based on language code
  const getFlagImagePath = (code: string): string => {
    // Special cases for specific languages
    if (code === 'en') return "/flags/gb.svg";
    if (code === 'zh') return "/flags/cn.svg";
    if (code === 'ja') return "/flags/jp.svg";
    if (code === 'ko') return "/flags/kr.svg";
    return `/flags/${code}.svg`;
  };

  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full rounded-lg bg-white">
          <SelectValue placeholder="Select language">
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded overflow-hidden shadow-sm">
                <img 
                  src={getFlagImagePath(value)} 
                  alt={value} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "/placeholder.svg";
                  }}
                />
              </div>
              <span>{languages.find(l => l.code === value)?.name || 'Select language'}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((language: Language) => (
            <SelectItem key={language.code} value={language.code}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded overflow-hidden shadow-sm">
                  <img 
                    src={getFlagImagePath(language.code)} 
                    alt={language.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <span>{language.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
