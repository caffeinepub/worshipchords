import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import { useListMessages, usePostMessage } from "../hooks/useQueries";

interface BandChatProps {
  userProfile: UserProfile | null | undefined;
  onSaveProfile: (name: string) => void;
}

export default function BandChat({
  userProfile,
  onSaveProfile,
}: BandChatProps) {
  const [text, setText] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: messages = [], isLoading } = useListMessages();
  const postMessage = usePostMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }); // runs after every render to scroll on new messages

  const authorName = userProfile?.name ?? "";

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const name = authorName || nameInput.trim();
    if (!name) {
      setShowNamePrompt(true);
      return;
    }
    try {
      await postMessage.mutateAsync({ authorName: name, text: trimmed });
      setText("");
      if (!authorName && nameInput.trim()) {
        onSaveProfile(nameInput.trim());
      }
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleNameSubmit = async () => {
    const name = nameInput.trim();
    if (!name) return;
    onSaveProfile(name);
    setShowNamePrompt(false);
    const trimmed = text.trim();
    if (trimmed) {
      try {
        await postMessage.mutateAsync({ authorName: name, text: trimmed });
        setText("");
      } catch {
        toast.error("Failed to send message");
      }
    }
  };

  const formatTime = (ts: bigint) => {
    const ms = Number(ts / BigInt(1_000_000));
    return new Date(ms).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const avatarColors = [
    "bg-chord/20 text-chord",
    "bg-success/20 text-success",
    "bg-accent/40 text-foreground",
    "bg-destructive/20 text-destructive",
  ];

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return avatarColors[hash % avatarColors.length];
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Band Chat
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {isLoading ? (
            <div
              className="flex items-center justify-center py-8"
              data-ocid="chat.loading_state"
            >
              <div className="w-4 h-4 border-2 border-chord border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-10 text-center"
              data-ocid="chat.empty_state"
            >
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Say hi to the band!
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={String(msg.id)}
                className="flex items-start gap-2 animate-fade-in"
                data-ocid={`chat.item.${idx + 1}`}
              >
                <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                  <AvatarFallback
                    className={`text-[9px] font-bold ${getAvatarColor(msg.authorName)}`}
                  >
                    {getInitials(msg.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {msg.authorName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed break-words">
                    {msg.text}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {showNamePrompt && (
        <div
          className="px-3 py-2 border-t border-border bg-card/80"
          data-ocid="chat.panel"
        >
          <p className="text-xs text-muted-foreground mb-2">
            What&apos;s your display name?
          </p>
          <div className="flex gap-2">
            <Input
              id="chat-name-input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
              placeholder="Your name"
              className="h-8 text-sm bg-input border-border flex-1"
              autoFocus
              data-ocid="chat.input"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleNameSubmit}
              className="h-8 bg-chord text-background hover:bg-chord/80"
              data-ocid="chat.confirm_button"
            >
              Set
            </Button>
          </div>
        </div>
      )}

      <div className="px-3 py-3 border-t border-border shrink-0">
        <div className="flex gap-2 items-center">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={
              authorName ? `Message as ${authorName}...` : "Type a message..."
            }
            className="flex-1 h-9 text-sm bg-input border-border"
            data-ocid="chat.textarea"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={postMessage.isPending || !text.trim()}
            className="h-9 w-9 p-0 bg-chord text-background hover:bg-chord/80 shrink-0"
            data-ocid="chat.submit_button"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
