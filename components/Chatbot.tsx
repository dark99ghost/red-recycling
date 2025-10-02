
import React, { useState, useEffect, useRef } from 'react';
import { Language, ChatMessage } from '../types';
import { startChat } from '../services/geminiService';
import { t } from '../utils/translations';
import { BotIcon, UserIcon, SendIcon } from './Icons';
import { Chat } from '@google/genai';

interface ChatbotProps {
  language: Language;
}

const Chatbot: React.FC<ChatbotProps> = ({ language }) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChat(startChat(language));
    setMessages([{
        id: 'initial',
        role: 'model',
        text: t('chatbot_greeting', language)
    }]);
    setInput('');
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chat || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
        const stream = await chat.sendMessageStream({ message: input });
        setIsLoading(false);
        
        let modelResponse = '';
        const modelMessageId = Date.now().toString() + '-model';

        // Add a placeholder for the model's response
        setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '...' }]);

        for await (const chunk of stream) {
            modelResponse += chunk.text;
            setMessages(prev => prev.map(msg => 
                msg.id === modelMessageId ? { ...msg, text: modelResponse } : msg
            ));
        }
    } catch (error) {
        console.error("Chat error:", error);
        setMessages(prev => [...prev, {
            id: 'error-' + Date.now(),
            role: 'model',
            text: t('error_chat', language)
        }]);
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[700px] bg-black/40 rounded-lg border border-cyan-500/20 shadow-lg backdrop-blur-sm animate-fade-in">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'model' && (
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-400">
                  <BotIcon small />
                </div>
              )}
              <div className={`max-w-md p-3 rounded-lg ${message.role === 'user' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300'}`}>
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
               {message.role === 'user' && (
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center text-gray-300">
                  <UserIcon />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length-1].role === 'user' && (
             <div className="flex items-start gap-3">
                 <div className="w-8 h-8 flex-shrink-0 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-400">
                  <BotIcon small />
                </div>
                <div className="max-w-md p-3 rounded-lg bg-gray-800 text-gray-300">
                    <span className="animate-pulse">...</span>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="border-t border-cyan-700/30 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chatbot_placeholder', language)}
            className="flex-1 bg-gray-900/50 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
            disabled={isLoading}
          />
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-md transition duration-300 disabled:bg-gray-600" disabled={isLoading || !input.trim()}>
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
