import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { appendRoomChatMessage, OnlineChatMessage } from '../utils/onlineRoomService';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { IconButton, TacticalButton, TacticalInput } from './ui/BlacksiteUI';

interface ChatBoxProps {
  roomId: string;
  messages: OnlineChatMessage[];
  currentUser: any;
  currentProfile: any;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  roomId,
  messages,
  currentUser,
  showChat,
  setShowChat,
}) => {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const lang = getSettings().language;
  const isRTL = ['ar', 'sa'].includes(lang);

  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || !currentUser || sending) return;

    setSending(true);
    try {
      await appendRoomChatMessage(roomId, trimmed.slice(0, 200));
      setMessageText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <AnimatePresence>
      {showChat && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-bg-main flex flex-col"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="px-4 py-3.5 bg-bg-surface border-b border-border-strong flex items-center justify-between">
            <h3 className="font-bold text-lg text-text-main flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-cyan-text" />
              <span>{getUITranslation(lang, 'chat')}</span>
              {messages?.length > 0 && (
                <span className="text-xs font-mono-code font-bold text-text-muted tabular-nums">
                  ({messages.length})
                </span>
              )}
            </h3>
            <IconButton
              onClick={() => setShowChat(false)}
              variant="secondary"
              size="sm"
              aria-label={getUITranslation(lang, 'cancel')}
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>

          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 max-w-2xl w-full mx-auto">
            {messages?.length > 0 ? (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-text-muted">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] font-mono-code text-text-muted/75 tabular-nums">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`px-3.5 py-2.5 rounded-[12px] max-w-[82%] text-sm font-medium break-words ${
                        isMe
                          ? `bg-[#668F9A] text-[#080B10] font-semibold ${
                              isRTL ? 'rounded-tl-[4px]' : 'rounded-tr-[4px]'
                            }`
                          : `bg-bg-surface border border-border-strong text-text-main ${
                              isRTL ? 'rounded-tr-[4px]' : 'rounded-tl-[4px]'
                            }`
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-65">
                <MessageCircle className="w-10 h-10 mb-2" />
                <span className="font-medium text-sm">
                  {getUITranslation(lang, 'noMessagesYet')}
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="w-full bg-bg-surface border-t border-border-strong px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            <form
              onSubmit={handleSendMessage}
              className="flex gap-2.5 max-w-2xl w-full mx-auto"
            >
              <TacticalInput
                type="text"
                value={messageText}
                maxLength={200}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={getUITranslation(lang, 'typeMessage')}
                className="flex-1"
              />
              <TacticalButton
                type="submit"
                disabled={!messageText.trim() || sending}
                loading={sending}
                variant="cyan"
                size="md"
                aria-label={getUITranslation(lang, 'sendClue')}
                icon={<Send className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
              />
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
