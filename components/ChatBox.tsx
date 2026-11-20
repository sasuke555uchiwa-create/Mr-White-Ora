import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { appendRoomChatMessage, OnlineChatMessage } from '../utils/onlineRoomService';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';

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
  currentProfile,
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
          className="fixed inset-0 z-50 bg-bg-dark/95 backdrop-blur-md flex flex-col"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="px-5 py-4 card-modern flex items-center justify-between border-b border-white/10 rounded-b-3xl">
            <h3 className="font-black text-xl flex items-center gap-2 drop-shadow-sm">
              <MessageCircle className="w-6 h-6 text-primary" />
              <span>{getUITranslation(lang, 'chat')}</span>
              {messages?.length > 0 && (
                <span className="text-xs font-black text-text-muted tabular-nums">
                  ({messages.length})
                </span>
              )}
            </h3>
            <button
              onClick={() => setShowChat(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10"
              aria-label={getUITranslation(lang, 'cancel')}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5">
            {messages?.length > 0 ? (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-2">
                      <span className="text-[11px] font-bold text-text-muted">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-text-muted/60 tabular-nums">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`px-4 py-2.5 rounded-2xl max-w-[82%] shadow-sm text-sm font-bold break-words ${
                        isMe
                          ? `bg-primary text-white ${
                              isRTL ? 'rounded-tl-sm' : 'rounded-tr-sm'
                            } shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]`
                          : `card-modern text-text-main ${isRTL ? 'rounded-tr-sm' : 'rounded-tl-sm'}`
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-60">
                <MessageCircle className="w-12 h-12 mb-2" />
                <span className="font-bold text-sm">
                  {getUITranslation(lang, 'noMessagesYet')}
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-4 card-modern border-t border-white/10 flex gap-3 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.2)]"
          >
            <input
              type="text"
              value={messageText}
              maxLength={200}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={getUITranslation(lang, 'typeMessage')}
              className="flex-1 bg-bg-dark border border-white/10 rounded-2xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-primary/50 shadow-inner transition-colors"
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className={`btn-modern min-h-[48px] min-w-[48px] px-4 rounded-2xl disabled:opacity-50 transition-colors flex items-center justify-center ${
                isRTL ? 'rotate-180' : ''
              }`}
              aria-label={getUITranslation(lang, 'sendClue')}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
