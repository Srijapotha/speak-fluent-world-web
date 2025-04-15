
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Percent } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const DiscountButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [selectedDiscount, setSelectedDiscount] = useState<string | null>(null);
  
  const discountOptions = [
    { id: "10off", label: "10% Off", code: "LINGO10" },
    { id: "25off", label: "25% Off", code: "LINGO25" },
    { id: "freeTrial", label: "Free Trial", code: "LINGOTRIAL" },
  ];
  
  const handleApplyDiscount = (discount: { id: string; label: string; code: string }) => {
    setSelectedDiscount(discount.id);
    navigator.clipboard.writeText(discount.code)
      .then(() => {
        toast.success(`${discount.label} code copied to clipboard: ${discount.code}`);
        setIsOpen(false);
      })
      .catch(() => {
        toast.error("Failed to copy code to clipboard");
      });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "bg-purple-600 hover:bg-purple-700 text-white gap-2 rounded-lg px-6 shadow-md",
            isMobile ? "py-2" : "py-6"
          )}
          size={isMobile ? "default" : "lg"}
        >
          <Percent className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
          <span className={isMobile ? "text-xs" : "text-sm"}>Discounts</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-white shadow-lg rounded-md border border-gray-200 z-50">
        <div className="space-y-3">
          <div className="font-medium text-lg text-center mb-2">Special Offers</div>
          
          <div className="space-y-2">
            {discountOptions.map((discount) => (
              <div 
                key={discount.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                  selectedDiscount === discount.id 
                    ? "bg-purple-100 border border-purple-300" 
                    : "hover:bg-gray-100 border border-transparent"
                )}
                onClick={() => handleApplyDiscount(discount)}
              >
                <div>
                  <div className="font-medium">{discount.label}</div>
                  <div className="text-xs text-gray-500">Code: {discount.code}</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="px-2 py-1 h-7 text-xs hover:bg-purple-100"
                >
                  Copy
                </Button>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-center text-gray-500 mt-2">
            Apply these discount codes at checkout
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DiscountButton;
