"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Импортируем EmojiPicker динамически, т.к. он не работает на сервере
const DynamicEmojiPicker = dynamic(
  () => import("emoji-picker-react").then((mod) => mod.default),
  { ssr: false }
);

interface EmojiPickerProps {
  currentEmoji?: string;
  onEmojiSelect: (emoji: string) => void;
  defaultIcon?: React.ReactNode;
  disabled?: boolean;
}

export function EmojiPicker({ 
  currentEmoji, 
  onEmojiSelect, 
  defaultIcon,
  disabled = false
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emojiData: any) => {
    if (disabled) return;
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={disabled ? () => {} : setIsOpen}>
      <div className="flex justify-start">
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={`${currentEmoji ? 'h-16 w-16 rounded-full' : 'h-9 w-auto rounded-md'} p-0 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            aria-label="Выбрать эмодзи"
            disabled={disabled}
          >
            {currentEmoji ? (
              <span className="text-4xl">{currentEmoji}</span>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="h-3.5 w-3.5" />
                <span>Добавить иконку</span>
              </div>
            )}
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-full p-0 border-none shadow-lg">
        <DynamicEmojiPicker
          onEmojiClick={handleEmojiClick}
          lazyLoadEmojis={true}
          searchPlaceHolder="Поиск эмодзи..."
          width="100%"
        />
      </PopoverContent>
    </Popover>
  );
} 