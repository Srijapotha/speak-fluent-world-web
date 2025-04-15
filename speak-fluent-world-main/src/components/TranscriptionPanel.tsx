
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TranscriptionMessage {
  id: string;
  text: string;
  translated: string;
  timestamp: Date;
  isLocal: boolean;
}

interface TranscriptionPanelProps {
  messages: TranscriptionMessage[];
  sourceLanguage: string;
  targetLanguage: string;
  onSendMessage?: (message: string) => void;
}

const TranscriptionPanel = ({ 
  messages, 
  sourceLanguage,
  targetLanguage,
  onSendMessage
}: TranscriptionPanelProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white/50 rounded-xl overflow-hidden">
      <div className="flex-1 overflow-auto px-4 py-2">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-3 py-2">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex flex-col ${message.isLocal ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex mb-1 text-xs text-gray-600">
                    {message.isLocal ? 'Hi Jane' : 'Hi Jane'}
                  </div>

                  <div 
                    className={cn(
                      "rounded-full px-4 py-2.5 max-w-[80%] text-white text-sm shadow-sm",
                      message.isLocal 
                        ? 'bg-gray-300 text-gray-700' 
                        : 'bg-blue-500'
                    )}
                  >
                    <p>{message.text}</p>
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-600">
                    <p className={cn(
                      "text-xs px-4 py-2.5 mt-1 rounded-full shadow-sm",
                      message.isLocal 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-300 text-gray-700'
                    )}>
                      {message.translated}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-gray-400">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start speaking after initiating a call</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex">
          <Input 
            placeholder="Type a message here" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-white rounded-full border-gray-300"
          />
          <Button 
            size="icon" 
            onClick={handleSendMessage}
            className="ml-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionPanel;
