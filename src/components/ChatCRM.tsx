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
  TrendingUp
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
}

const ChatCRM = ({ open, onOpenChange }: ChatCRMProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [crmDataContext, setCrmDataContext] = useState<CRMDataContext | null>(null);
  const [isLoadingCRMData, setIsLoadingCRMData] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      console.log('Fetching CRM data for ChatCRM context...');
      const data = await fetchCRMData(user.id);
      setCrmDataContext(data);
      console.log('CRM data loaded:', data.summary);
      
      toast({
        title: "CRM Data Loaded",
        description: `Loaded ${data.summary.totalDeals} deals, ${data.summary.totalContacts} contacts, and ${data.summary.totalCompanies} companies for AI context.`,
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

  // Create new chat session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setCurrentSession(newSession);
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!isOpenAIConfigured()) {
        throw new Error('OpenAI API key not configured');
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      // Update current session with user message
      let session = currentSession;
      if (!session) {
        session = {
          id: `session_${Date.now()}`,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          messages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setCurrentSession(session);
      }

      const updatedMessages = [...session.messages, userMessage];
      const updatedSession = {
        ...session,
        messages: updatedMessages,
        updated_at: new Date().toISOString()
      };
      setCurrentSession(updatedSession);

      // Prepare CRM context for AI
      let crmContext = '';
      let dataAnalysis = '';
      
      if (crmDataContext) {
        crmContext = formatCRMDataForAI(crmDataContext);
        dataAnalysis = analyzeDataTrends(crmDataContext);
      }

      // Prepare messages for OpenAI (include conversation history and CRM context)
      const systemPrompt = `You are ChatCRM, an AI assistant specialized in Customer Relationship Management (CRM) and sales. You help users with:

- CRM strategy and best practices
- Sales process optimization
- Lead management and qualification
- Customer relationship building
- Deal pipeline management
- Sales analytics and reporting
- Email templates and communication
- Customer segmentation
- Sales forecasting
- Team management and training

${crmContext ? `
IMPORTANT: You have access to the user's actual CRM data. Use this real data to provide specific, data-driven insights and recommendations.

${crmContext}

${dataAnalysis}

When answering questions:
1. Reference specific data points from the user's CRM
2. Provide actionable insights based on actual performance metrics
3. Suggest improvements based on current data patterns
4. Calculate specific recommendations using real numbers
5. Identify trends and opportunities in the actual data
6. Compare performance against industry standards when relevant
` : `
Note: CRM data is not currently available. Provide general CRM guidance and best practices.
`}

You should provide practical, actionable advice. Be conversational, helpful, and focus on driving business results. Keep responses concise but comprehensive.

Current conversation context: This is an ongoing conversation with a CRM user who may ask about various sales and customer management topics.`;

      const openAIMessages: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...updatedMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];

      // Get AI response
      const aiResponse = await makeOpenAIRequest(openAIMessages, {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1500
      });

      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      // Update session with assistant message
      const finalMessages = [...updatedMessages, assistantMessage];
      const finalSession = {
        ...updatedSession,
        messages: finalMessages,
        updated_at: new Date().toISOString()
      };

      // Save to localStorage
      const allSessions = chatSessions.filter(s => s.id !== finalSession.id);
      allSessions.unshift(finalSession);
      saveChatSessions(allSessions);

      setCurrentSession(finalSession);
      return finalSession;
    },
    onSuccess: () => {
      setCurrentMessage('');
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Message failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTyping(false);
    }
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim() || isTyping) return;
    
    setIsTyping(true);
    sendMessageMutation.mutate(currentMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const deleteSession = (sessionId: string) => {
    const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
    saveChatSessions(updatedSessions);
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
    
    toast({
      title: "Chat deleted",
      description: "The chat session has been removed.",
    });
  };

  const clearCurrentChat = () => {
    setCurrentSession(null);
    setCurrentMessage('');
  };

  const exportChat = () => {
    if (!currentSession) return;
    
    const chatText = currentSession.messages
      .map(msg => `${msg.role === 'user' ? 'You' : 'ChatCRM'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentSession.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">ChatCRM</DialogTitle>
                <DialogDescription>
                  AI-powered CRM assistant with real-time data analysis
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {crmDataContext && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Database className="w-3 h-3 mr-1" />
                  {crmDataContext.summary.totalDeals} deals, {crmDataContext.summary.totalContacts} contacts
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

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Chat Sessions */}
          <div className="w-64 border-r bg-slate-50 flex flex-col">
            <div className="p-4 border-b">
              <Button 
                onClick={createNewSession} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                size="sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                      currentSession?.id === session.id 
                        ? 'bg-blue-100 border border-blue-200' 
                        : 'hover:bg-white border border-transparent'
                    }`}
                    onClick={() => loadSession(session)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {session.messages.length} messages
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {chatSessions.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No chat sessions yet</p>
                    <p className="text-xs">Start a new conversation</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {currentSession ? (
              <>
                {/* Chat Header */}
                <div className="px-6 py-3 border-b bg-white flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">{currentSession.title}</h3>
                    <p className="text-sm text-slate-500">
                      {currentSession.messages.length} messages • Started {new Date(currentSession.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={exportChat}>
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearCurrentChat}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      New
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    {currentSession.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start space-x-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                              <Bot className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs ${
                              message.role === 'user' ? 'text-blue-100' : 'text-slate-500'
                            }`}>
                              {formatTime(message.timestamp)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 ${
                                message.role === 'user' 
                                  ? 'text-blue-100 hover:text-white hover:bg-blue-700' 
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              onClick={() => copyToClipboard(message.content)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {message.role === 'user' && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-slate-200">
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-slate-100 rounded-lg px-4 py-3">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                        placeholder={isOpenAIConfigured() ? "Ask me anything about CRM, sales, or customer management..." : "OpenAI API key required"}
                        disabled={isTyping || !isOpenAIConfigured()}
                        className="min-h-[44px] resize-none"
                      />
                    </div>
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
                </div>
              </>
            ) : (
              /* Welcome Screen */
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome to ChatCRM</h3>
                  <p className="text-slate-600 mb-6">
                    Your AI-powered CRM assistant with access to your real business data. 
                    Get insights, recommendations, and answers based on your actual deals, contacts, and performance.
                  </p>
                  
                  {crmDataContext && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-center mb-3">
                        <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="font-medium text-blue-900">Your CRM Data Loaded</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-blue-900">{crmDataContext.summary.totalDeals}</div>
                          <div className="text-blue-700">Active Deals</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-900">{crmDataContext.summary.totalContacts}</div>
                          <div className="text-blue-700">Contacts</div>
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
                  
                  <div className="space-y-3 text-left">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">💡 Ask me about:</p>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• "What's my pipeline health?"</li>
                        <li>• "Which deals need attention?"</li>
                        <li>• "How can I improve my close rate?"</li>
                        <li>• "Show me my top performing contacts"</li>
                        <li>• "Analyze my sales trends"</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={createNewSession}
                    className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600"
                    disabled={!isOpenAIConfigured()}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Data-Driven Conversation
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatCRM; 