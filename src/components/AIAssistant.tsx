import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  MessageSquare, 
  Sparkles, 
  Search, 
  Building, 
  Users, 
  Mail, 
  TrendingUp, 
  Target, 
  FileText,
  Send,
  Copy,
  ThumbsUp,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { generateObjectionSuggestions, generateAIAssistantResponse, isOpenAIConfigured } from '@/lib/openai';
import { useToast } from '@/hooks/use-toast';

interface AITemplate {
  id: string;
  title: string;
  description: string;
  category: 'research' | 'email' | 'analysis' | 'strategy';
  icon: any;
  prompt: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIAssistant = () => {
  const [activeMode, setActiveMode] = useState<'templates' | 'chat'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const aiTemplates: AITemplate[] = [
    {
      id: 'research-company',
      title: 'Research and evaluate a company for fit',
      description: 'Research a company to determine if their needs align with your offering.',
      category: 'research',
      icon: Building,
      prompt: 'Research the company [COMPANY_NAME] and analyze if they would be a good fit for our [PRODUCT/SERVICE]. Consider their industry, size, recent news, and potential pain points that our solution could address.'
    },
    {
      id: 'confirm-decision-maker',
      title: 'Confirm decision-maker',
      description: 'Determine if a contact is a valid decision-maker.',
      category: 'research',
      icon: Users,
      prompt: 'Analyze the role and responsibilities of [CONTACT_NAME] at [COMPANY_NAME] to determine if they are a decision-maker for [PRODUCT/SERVICE] purchases. Consider their title, department, and typical decision-making authority.'
    },
    {
      id: 'personalized-email',
      title: 'Create personalized email with PS line',
      description: 'Generate an email with a personalized PS line tailored to a specific contact.',
      category: 'email',
      icon: Mail,
      prompt: 'Create a personalized sales email for [CONTACT_NAME] at [COMPANY_NAME]. Include a compelling subject line, value proposition for [PRODUCT/SERVICE], and a personalized PS line that references something specific about their company or industry.'
    },
    {
      id: 'summarize-news',
      title: 'Summarize company news',
      description: 'Gather and summarize the most recent news about a company.',
      category: 'research',
      icon: FileText,
      prompt: 'Find and summarize the most recent news and developments about [COMPANY_NAME] from the last 3 months. Focus on business developments, expansions, challenges, or opportunities that could be relevant for sales outreach.'
    },
    {
      id: 'job-openings',
      title: 'Identify relevant job openings',
      description: 'Determine if the target company has open jobs that align to your value proposition.',
      category: 'analysis',
      icon: Search,
      prompt: 'Research current job openings at [COMPANY_NAME] that might indicate they need [PRODUCT/SERVICE]. Analyze how these openings suggest pain points or growth areas where our solution could provide value.'
    },
    {
      id: 'identify-competitors',
      title: 'Identify competitors',
      description: 'Find competitors of your target account.',
      category: 'analysis',
      icon: Target,
      prompt: 'Identify the main competitors of [COMPANY_NAME] in the [INDUSTRY] space. Analyze their competitive landscape and how our [PRODUCT/SERVICE] could help them gain an advantage over these competitors.'
    }
  ];

  const filteredTemplates = aiTemplates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTryTemplate = (template: AITemplate) => {
    setSelectedTemplate(template);
    setCustomPrompt(template.prompt);
    setActiveMode('chat');
    
    // Add the template prompt as a user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: template.prompt,
      timestamp: new Date()
    };
    
    setChatMessages([userMessage]);
    
    toast({
      title: "Template loaded",
      description: `${template.title} template is ready to use. Customize the prompt and send!`,
    });
  };

  const handleSendMessage = async () => {
    if (!customPrompt.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: customPrompt,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

    try {
      let responseContent: string;
      
      if (openAIConfigured) {
        // Use actual OpenAI API
        responseContent = await generateAIAssistantResponse(customPrompt);
      } else {
        // Provide helpful fallback response
        responseContent = `I understand you'd like help with: "${customPrompt}"\n\nTo enable full AI functionality, please configure your OpenAI API key in the environment variables.\n\nFor now, I can suggest that you:\n\n• Gather relevant information about your target\n• Research their recent activities and news\n• Identify specific pain points\n• Craft a personalized approach\n• Use the AI templates as starting points\n\nWould you like me to help you with any specific aspect of this request?`;
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setCustomPrompt('');
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I apologize, but I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or check your API configuration.`,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to generate AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard.",
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'research': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'analysis': return 'bg-purple-100 text-purple-800';
      case 'strategy': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openAIConfigured = isOpenAIConfigured();

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            AI Assistant
          </CardTitle>
          <CardDescription>
            Choose from AI templates or create custom prompts for sales assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mode Selection */}
          <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as 'templates' | 'chat')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100">
              <TabsTrigger value="templates" className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Templates
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Custom Prompt
              </TabsTrigger>
            </TabsList>

            {/* AI Templates Tab */}
            <TabsContent value="templates" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-4">
                  <span className="font-medium">All templates</span> • {filteredTemplates.length} available
                </div>

                <div className="overflow-x-auto pb-4">
                  <div className="flex space-x-4 min-w-max">
                    {filteredTemplates.map((template) => {
                      const Icon = template.icon;
                      return (
                        <Card key={template.id} className="border border-slate-200 hover:shadow-md transition-shadow flex-shrink-0 w-80">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <Icon className="w-5 h-5 text-slate-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                                      {template.title}
                                    </h3>
                                    <Badge variant="outline" className={`mt-1 text-xs ${getCategoryColor(template.category)}`}>
                                      {template.category}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {template.description}
                              </p>
                              
                              <Button 
                                onClick={() => handleTryTemplate(template)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                                size="sm"
                              >
                                Try it
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8 text-slate-600">
                    <Search className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p>No templates found matching your search.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Custom Prompt Tab */}
            <TabsContent value="chat" className="space-y-6">
              <div className="space-y-4">
                {/* Chat Messages */}
                <Card className="border border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Conversation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96 w-full">
                      <div className="space-y-4">
                        {chatMessages.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <Lightbulb className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                            <p className="text-sm">Start a conversation with the AI assistant</p>
                            <p className="text-xs text-slate-400 mt-1">Ask questions or use a template to get started</p>
                          </div>
                        ) : (
                          chatMessages.map((message) => (
                            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-lg p-3 ${
                                message.type === 'user' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-slate-100 text-slate-900'
                              }`}>
                                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                <div className="flex items-center justify-between mt-2">
                                  <div className={`text-xs ${
                                    message.type === 'user' ? 'text-blue-100' : 'text-slate-500'
                                  }`}>
                                    {message.timestamp.toLocaleTimeString()}
                                  </div>
                                  {message.type === 'assistant' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopyMessage(message.content)}
                                      className="h-6 w-6 p-0 hover:bg-slate-200"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        
                        {isGenerating && (
                          <div className="flex justify-start">
                            <div className="bg-slate-100 rounded-lg p-3 max-w-[80%]">
                              <div className="flex items-center space-x-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                                <span className="text-sm text-slate-600">AI is thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Input Area */}
                <Card className="border border-slate-200">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          What would you like to generate for each record?
                        </label>
                        <Textarea
                          placeholder="Write instructions in your own words to generate an output for each record. What can I do?"
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          className="min-h-[120px] resize-none"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          {openAIConfigured ? (
                            <span className="text-green-600">✓ AI enabled</span>
                          ) : (
                            <span className="text-orange-600">⚠ Configure OpenAI API key for full functionality</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setChatMessages([]);
                              setCustomPrompt('');
                            }}
                          >
                            Clear
                          </Button>
                          <Button
                            onClick={handleSendMessage}
                            disabled={!customPrompt.trim() || isGenerating}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          >
                            {isGenerating ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistant; 