import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  Trash2, 
  Download, 
  Copy,
  Loader2,
  Sparkles,
  Brain,
  RefreshCw,
  Settings,
  Database,
  TrendingUp,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  isOpenAIConfigured,
  makeOpenAIRequest,
  fetchCRMData,
  formatCRMDataForAI,
  analyzeDataTrends,
  type OpenAIMessage,
  type CRMDataContext
} from '@/lib/ai';

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tokens?: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

interface ChatCRMProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessage?: string;
}

const ChatCRM = ({ open, onOpenChange, initialMessage }: ChatCRMProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [crmDataContext, setCrmDataContext] = useState<CRMDataContext | null>(null);
  const [isLoadingCRMData, setIsLoadingCRMData] = useState(false);
  
  // Voice assistant state
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognitionConstructor();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
      };
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setCurrentMessage(transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Could not process voice input. Please try again.",
          variant: "destructive",
        });
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
      setIsVoiceSupported(true);
    }
  }, [toast]);

  // Text-to-speech function
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start voice recognition
  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
    }
  };

  // Stop voice recognition
  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Load chat sessions from localStorage
  const { data: chatSessions = [], refetch } = useQuery({
    queryKey: ['chat-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const stored = localStorage.getItem(`chat-sessions-${user.id}`);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!user,
  });

  // Fetch CRM data when dialog opens
  useEffect(() => {
    if (open && user && !crmDataContext) {
      loadCRMData();
    }
  }, [open, user]);

  const loadCRMData = async () => {
    if (!user) return;
    
    setIsLoadingCRMData(true);
    try {
      console.log('Fetching comprehensive CRM data for ChatCRM context...');
      const data = await fetchCRMData(user.id);
      setCrmDataContext(data);
      console.log('Comprehensive CRM data loaded:', data.summary);
      
      toast({
        title: "CRM Data Loaded",
        description: `Loaded ${data.summary.totalDeals} deals, ${data.summary.totalContacts} contacts, ${data.summary.totalLeads} leads, ${data.summary.totalActivities} activities, ${data.summary.totalEmails} emails, ${data.summary.totalFiles} files, and ${data.summary.totalTranscripts} transcripts for AI context.`,
      });
    } catch (error) {
      console.error('Error loading CRM data:', error);
      toast({
        title: "CRM Data Error",
        description: "Failed to load CRM data. AI responses may be limited.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCRMData(false);
    }
  };

  // Save chat sessions to localStorage
  const saveChatSessions = (sessions: ChatSession[]) => {
    if (user) {
      localStorage.setItem(`chat-sessions-${user.id}`, JSON.stringify(sessions));
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle initial message when provided
  useEffect(() => {
    if (open && initialMessage && initialMessage.trim()) {
      setCurrentMessage(initialMessage);
      // Create new session if none exists
      if (!currentSession) {
        createNewSession();
      }
    }
  }, [open, initialMessage]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user || !currentSession) throw new Error('No active session');
      
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      // Add user message to session
      const updatedSession = {
        ...currentSession,
        messages: [...currentSession.messages, userMessage],
        updated_at: new Date().toISOString(),
      };

      setCurrentSession(updatedSession);

      // Prepare messages for OpenAI
      const systemMessage: OpenAIMessage = {
        role: "system",
        content: `You are an expert CRM AI assistant for Deal Whisperer CRM. You have access to comprehensive real-time data from the user's CRM system.

${crmDataContext ? formatCRMDataForAI(crmDataContext) : 'No CRM data available at the moment.'}

Your role:
- Provide data-driven insights and recommendations
- Answer questions about deals, contacts, companies, leads, activities, emails, files, transcripts, and all CRM data
- Help with sales strategy and customer relationship management
- Offer actionable advice based on the actual data
- Be conversational but professional
- Always reference specific data when making recommendations

Guidelines:
- Use the real data provided to give specific, actionable insights
- When discussing performance, cite actual numbers from the data
- Suggest concrete next steps based on the data patterns
- Be helpful and proactive in identifying opportunities and risks
- Keep responses focused and valuable for sales and CRM management`
      };

      const conversationMessages: OpenAIMessage[] = [
        systemMessage,
        ...updatedSession.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];

      const response = await makeOpenAIRequest(conversationMessages, {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 1000
      });

      if (!response) {
        throw new Error('No response from AI');
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
        updated_at: new Date().toISOString(),
      };

      // Update sessions in storage
      const allSessions = chatSessions.map(s => 
        s.id === finalSession.id ? finalSession : s
      );
      saveChatSessions(allSessions);

      return { session: finalSession, response };
    },
    onSuccess: ({ session, response }) => {
      setCurrentSession(session);
      refetch();
      
      // Speak the response if text-to-speech is available
      if ('speechSynthesis' in window && response) {
        // Extract just the text content, removing any markdown formatting
        const cleanResponse = response.replace(/[*#`]/g, '').replace(/\n+/g, ' ').trim();
        if (cleanResponse.length < 500) { // Only speak shorter responses
          speakResponse(cleanResponse);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Message failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !currentSession) return;
    
    setIsTyping(true);
    const messageToSend = currentMessage;
    setCurrentMessage('');
    
    sendMessageMutation.mutate(messageToSend, {
      onSettled: () => setIsTyping(false)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedSessions = [newSession, ...chatSessions];
    saveChatSessions(updatedSessions);
    setCurrentSession(newSession);
    refetch();
  };

  const deleteSession = (sessionId: string) => {
    const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
    saveChatSessions(updatedSessions);
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
    
    refetch();
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Message content has been copied.",
    });
  };

  const exportChat = () => {
    if (!currentSession) return;
    
    const chatContent = currentSession.messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentSession.title}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900">ChatCRM AI Assistant</DialogTitle>
                  <DialogDescription className="text-slate-600">
                    AI-powered insights from your complete CRM data
                  </DialogDescription>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {crmDataContext && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Database className="w-3 h-3 mr-1" />
                    {crmDataContext.summary.totalDeals} deals, {crmDataContext.summary.totalContacts} contacts, {crmDataContext.summary.totalLeads} leads, {crmDataContext.summary.totalActivities} activities, {crmDataContext.summary.totalEmails} emails, {crmDataContext.summary.totalFiles} files
                  </Badge>
                )}
                {isLoadingCRMData && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Loading CRM Data
                  </Badge>
                )}
                {!isOpenAIConfigured() && (
                  <Badge variant="destructive" className="text-xs">
                    API Key Required
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={loadCRMData} disabled={isLoadingCRMData}>
                  <RefreshCw className={`w-4 h-4 ${isLoadingCRMData ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r bg-slate-50 flex flex-col">
              <div className="p-4 border-b">
                <Button 
                  onClick={createNewSession}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                  disabled={!isOpenAIConfigured()}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </div>
              
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                        currentSession?.id === session.id
                          ? 'bg-blue-100 border border-blue-200'
                          : 'bg-white hover:bg-slate-100 border border-slate-200'
                      }`}
                      onClick={() => setCurrentSession(session)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {session.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-400">
                            {session.messages.length} messages
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {currentSession ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-white">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{currentSession.title}</h3>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={exportChat}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {currentSession.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-4 ${
                              message.role === 'user'
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                                : 'bg-white border border-slate-200'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>
                                  {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">
                                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs opacity-70">
                                      {new Date(message.timestamp).toLocaleTimeString()}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyMessage(message.content)}
                                      className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="prose prose-sm max-w-none">
                                  <p className="whitespace-pre-wrap">{message.content}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>
                                  <Bot className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="p-6 border-t bg-white">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1">
                        <Input
                          ref={inputRef}
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={isOpenAIConfigured() ? "Ask me anything about your CRM data, sales, or customer management..." : "OpenAI API key required"}
                          disabled={isTyping || !isOpenAIConfigured()}
                          className="min-h-[44px] resize-none"
                        />
                      </div>
                      
                      {/* Voice Assistant Controls */}
                      {isVoiceSupported && (
                        <div className="flex items-center space-x-2">
                          {isSpeaking ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={stopSpeaking}
                              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={isListening ? stopListening : startListening}
                              disabled={isTyping || !isOpenAIConfigured()}
                              className={isListening ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"}
                            >
                              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <Button
                        onClick={handleSendMessage}
                        disabled={!currentMessage.trim() || isTyping || !isOpenAIConfigured()}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {isTyping ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    
                    {!isOpenAIConfigured() && (
                      <p className="text-xs text-red-500 mt-2">
                        Please configure your OpenAI API key to use ChatCRM
                      </p>
                    )}
                    
                    {isListening && (
                      <p className="text-xs text-blue-600 mt-2 flex items-center">
                        <Mic className="w-3 h-3 mr-1 animate-pulse" />
                        Listening... Speak now
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    {crmDataContext && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-center mb-3">
                          <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="font-medium text-blue-900">Your Complete CRM Data Loaded</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-blue-900">{crmDataContext.summary.totalDeals}</div>
                            <div className="text-blue-700">Deals</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-900">{crmDataContext.summary.totalContacts}</div>
                            <div className="text-blue-700">Contacts</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-900">{crmDataContext.summary.totalLeads}</div>
                            <div className="text-blue-700">Leads</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-900">{crmDataContext.summary.totalActivities}</div>
                            <div className="text-blue-700">Activities</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-900">{crmDataContext.summary.totalEmails}</div>
                            <div className="text-blue-700">Emails</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-900">{crmDataContext.summary.totalFiles}</div>
                            <div className="text-blue-700">Files</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-900">${(crmDataContext.summary.totalRevenue / 1000).toFixed(0)}K</div>
                            <div className="text-blue-700">Pipeline Value</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-900">{crmDataContext.summary.conversionRate.toFixed(1)}%</div>
                            <div className="text-blue-700">Close Rate</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">💡 Ask me about:</p>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• "What's my pipeline health across all data?"</li>
                        <li>• "Which deals need attention based on activities?"</li>
                        <li>• "Analyze my email engagement patterns"</li>
                        <li>• "Show insights from my recent transcripts"</li>
                        <li>• "How can I improve lead conversion?"</li>
                        <li>• "What files are most important for closing deals?"</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={createNewSession}
                    className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600"
                    disabled={!isOpenAIConfigured()}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Comprehensive Data Analysis
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatCRM; 