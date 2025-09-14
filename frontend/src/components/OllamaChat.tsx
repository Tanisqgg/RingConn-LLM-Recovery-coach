import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Minimize2, Maximize2 } from 'lucide-react';
import { AppleCard } from './AppleCard';
import { postChat } from '../lib/api';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface OllamaChatProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function OllamaChat({ isMinimized = false, onToggleMinimize }: OllamaChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI health assistant powered by Ollama. I can help analyze your health data, provide insights, and answer questions about your wellness journey. How can I help you today?',
      timestamp: new Date()
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call the real API
      const response = await postChat(inputMessage);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling Ollama:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again later.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={onToggleMinimize}
          className="bg-oura-readiness hover:bg-indigo-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          <Bot className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 z-50 max-w-[calc(100vw-3rem)]">
      <AppleCard className="h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-oura-readiness/20 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-oura-readiness" />
            </div>
            <div>
              <h3 className="text-white font-semibold">AI Health Coach</h3>
              <p className="text-xs text-dark-secondary">Powered by Ollama</p>
            </div>
          </div>
          <button
            onClick={onToggleMinimize}
            className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
          >
            <Minimize2 className="w-4 h-4 text-dark-secondary" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-blue-500/20' 
                    : 'bg-oura-readiness/20'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-3 h-3 text-blue-500" />
                  ) : (
                    <Bot className="w-3 h-3 text-oura-readiness" />
                  )}
                </div>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-dark-hover text-white'
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-dark-secondary'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-2 max-w-[80%]">
                <div className="w-6 h-6 bg-oura-readiness/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-oura-readiness" />
                </div>
                <div className="bg-dark-hover rounded-2xl px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-oura-readiness rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-oura-readiness rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-oura-readiness rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-dark-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about your health metrics..."
              className="flex-1 px-4 py-3 bg-dark-hover text-white rounded-xl border border-dark-border focus:border-oura-readiness focus:outline-none placeholder-dark-secondary"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-3 bg-oura-readiness text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </AppleCard>
    </div>
  );
}