
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const Header = () => {
  return (
    <header className={cn(
      "bg-white/80 backdrop-blur-sm shadow-md sticky top-0 z-10",
      "border-b border-gray-200"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-md">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
              WebRTC Translator
            </h1>
            <span className="hidden sm:block ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
              demo
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-600 hidden md:block">Real-time translation for video calls</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
