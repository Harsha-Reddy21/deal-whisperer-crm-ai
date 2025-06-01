import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  Database
} from 'lucide-react';
import { isOpenAIConfigured } from '@/lib/ai';
import { useToast } from '@/hooks/use-toast';
import ChatCRM from './ChatCRM';

interface AITemplate {
  id: string;
  title: string;
  description: string;
  category: 'research' | 'email' | 'analysis' | 'strategy';
  icon: any;
  prompt: string;
}

const AIAssistant = () => {
  const [activeMode, setActiveMode] = useState<'templates' | 'chatcrm'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatCRM, setShowChatCRM] = useState(false);
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
    setActiveMode('chatcrm');
    setShowChatCRM(true);
    
    toast({
      title: "Template selected",
      description: `${template.title} template loaded. You can now use it in ChatCRM.`,
    });
  };

  const handleOpenChatCRM = () => {
    setShowChatCRM(true);
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
          <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as 'templates' | 'chatcrm')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100">
              <TabsTrigger value="templates" className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Templates
              </TabsTrigger>
              <TabsTrigger value="chatcrm" className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat CRM
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

            {/* Chat CRM Tab */}
            <TabsContent value="chatcrm" className="space-y-6">
              <div className="space-y-4">
                <Card className="border border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Database className="w-4 h-4 mr-2" />
                      ChatCRM - Data-Driven AI Assistant
                    </CardTitle>
                    <CardDescription>
                      Intelligent AI assistant with access to your real CRM data for contextual insights and recommendations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Ready to Chat with Your CRM Data
                      </h3>
                      <p className="text-slate-600 mb-6 max-w-md mx-auto">
                        Get specific insights, recommendations, and analysis based on your actual deals, contacts, and performance metrics.
                      </p>
                      
                      {selectedTemplate && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
                          <div className="flex items-center justify-center mb-2">
                            <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-blue-900">Template Selected</span>
                          </div>
                          <p className="text-sm text-blue-700">{selectedTemplate.title}</p>
                          <p className="text-xs text-blue-600 mt-1">You can use this template as a starting point in ChatCRM</p>
                        </div>
                      )}
                      
                      <Button 
                        onClick={handleOpenChatCRM}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        size="lg"
                      >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Open ChatCRM
                      </Button>
                      
                      <div className="mt-6 text-xs text-slate-500">
                        {openAIConfigured ? (
                          <span className="text-green-600">✓ AI enabled with real CRM data access</span>
                        ) : (
                          <span className="text-orange-600">⚠ Configure OpenAI API key for full functionality</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* ChatCRM Dialog */}
      <ChatCRM open={showChatCRM} onOpenChange={setShowChatCRM} />
    </div>
  );
};

export default AIAssistant; 