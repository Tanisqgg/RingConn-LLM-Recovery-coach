import React, { useState } from 'react';
import { Send, RefreshCw } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export function AICoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Good morning! Your recovery looks great today. Your HRV increased 15% overnight and sleep quality was excellent. Ready to tackle your workout?',
      timestamp: '9:15 AM'
    },
    {
      id: '2',
      type: 'user',
      content: 'Should I do a high intensity workout today?',
      timestamp: '9:16 AM'
    },
    {
      id: '3',
      type: 'ai',
      content: 'Based on your readiness score of 87% and excellent recovery metrics, yes! Your body is well-prepared. I recommend a 30-40 minute session with 80% intensity.',
      timestamp: '9:17 AM'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I\'m analyzing your latest health data to provide personalized recommendations. Your patterns show great consistency!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSync = () => {
    // Simulate data sync
    console.log('Syncing health data...');
  };

  return (
    <div className="bg-dark-card rounded-2xl p-6 dark-shadow h-96 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-primary">AI Health Coach</h3>
        <button
          onClick={handleSync}
          className="p-2 rounded-lg bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-3 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-neon-blue text-white ml-4'
                  : 'bg-dark-hover text-dark-primary mr-4'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <div className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-blue-100' : 'text-dark-secondary'
              }`}>
                {message.timestamp}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-dark-hover text-dark-primary px-4 py-3 rounded-2xl mr-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask about your health..."
          className="flex-1 px-4 py-2 bg-dark-hover text-dark-primary rounded-xl border border-dark-border focus:border-neon-blue focus:outline-none"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 py-2 bg-neon-blue text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}