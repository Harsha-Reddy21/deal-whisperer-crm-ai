import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Database,
  Briefcase,
  UserCheck,
  Construction,
  BarChart3,
  Send
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
  fields?: {
    id: string;
    label: string;
    type: 'text' | 'textarea';
    placeholder: string;
    required: boolean;
  }[];
}

const AIAssistant = () => {
  const [activeMode, setActiveMode] = useState<'templates' | 'chatcrm'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatCRM, setShowChatCRM] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string>('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateFormData, setTemplateFormData] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const aiTemplates: AITemplate[] = [
    {
      id: 'research-company',
      title: 'Research and evaluate a company for fit',
      description: 'Research a company to determine if their needs align with your offering.',
      category: 'research',
      icon: Building,
      prompt: `I need help researching and evaluating a company to determine if they would be a good fit for my product/service.

Company Name: {companyName}
My Product/Service: {productService}

Please analyze this company and provide:
1. Company overview (industry, size, business model)
2. Recent news and developments
3. Potential pain points our solution could address
4. Decision makers and key contacts
5. Competitive landscape
6. Fit assessment and recommendations
7. Suggested approach for outreach

Use my actual CRM data to provide context about similar companies we've worked with and successful strategies.`,
      fields: [
        {
          id: 'companyName',
          label: 'Company Name',
          type: 'text',
          placeholder: 'Enter the company name you want to research',
          required: true
        },
        {
          id: 'productService',
          label: 'Your Product/Service',
          type: 'textarea',
          placeholder: 'Describe what you are selling and its key benefits',
          required: true
        }
      ]
    },
    {
      id: 'confirm-decision-maker',
      title: 'Confirm decision-maker',
      description: 'Determine if a contact is a valid decision-maker.',
      category: 'research',
      icon: Users,
      prompt: `Analyze the role and responsibilities of a contact to determine if they are a decision-maker.

Contact Name: {contactName}
Company: {companyName}
Contact Title/Role: {contactTitle}
Product/Service: {productService}

Please analyze:
1. Their title and typical decision-making authority
2. Department and organizational influence
3. Budget authority for this type of purchase
4. Involvement in similar buying decisions
5. Key stakeholders they influence or report to
6. Recommended approach if they are/aren't the decision-maker
7. Who else should be involved in the sales process

Use my CRM data to reference similar contacts and successful decision-maker strategies.`,
      fields: [
        {
          id: 'contactName',
          label: 'Contact Name',
          type: 'text',
          placeholder: 'Enter the contact\'s full name',
          required: true
        },
        {
          id: 'companyName',
          label: 'Company Name',
          type: 'text',
          placeholder: 'Enter their company name',
          required: true
        },
        {
          id: 'contactTitle',
          label: 'Contact Title/Role',
          type: 'text',
          placeholder: 'Enter their job title or role',
          required: true
        },
        {
          id: 'productService',
          label: 'Your Product/Service',
          type: 'textarea',
          placeholder: 'Describe what you are selling',
          required: true
        }
      ]
    },
    {
      id: 'personalized-email',
      title: 'Create personalized email with PS line',
      description: 'Generate an email with a personalized PS line tailored to a specific contact.',
      category: 'email',
      icon: Mail,
      prompt: `Help me create a personalized sales email for a specific contact.

Contact Name: {contactName}
Company: {companyName}
Contact Title/Role: {contactTitle}
My Product/Service: {productService}
Context/Reason for reaching out: {context}

Please create:
1. Compelling subject line
2. Personalized opening that references their company/role
3. Clear value proposition relevant to their business
4. Specific benefits for their situation
5. Soft call-to-action
6. Personalized PS line that shows research and genuine interest

Use my CRM data to reference similar successful emails and personalization strategies that have worked.`,
      fields: [
        {
          id: 'contactName',
          label: 'Contact Name',
          type: 'text',
          placeholder: 'Enter the contact\'s full name',
          required: true
        },
        {
          id: 'companyName',
          label: 'Company Name',
          type: 'text',
          placeholder: 'Enter their company name',
          required: true
        },
        {
          id: 'contactTitle',
          label: 'Contact Title/Role',
          type: 'text',
          placeholder: 'Enter their job title or role',
          required: true
        },
        {
          id: 'productService',
          label: 'Your Product/Service',
          type: 'textarea',
          placeholder: 'Describe what you are selling',
          required: true
        },
        {
          id: 'context',
          label: 'Context/Reason for reaching out',
          type: 'textarea',
          placeholder: 'Why are you reaching out? Any specific context or trigger?',
          required: false
        }
      ]
    },
    {
      id: 'summarize-news',
      title: 'Summarize company news',
      description: 'Gather and summarize the most recent news about a company.',
      category: 'research',
      icon: FileText,
      prompt: `Please help me research and summarize recent news about a specific company.

Company Name: {companyName}

Please provide:
1. Recent news and developments (last 3-6 months)
2. Business expansions or new initiatives
3. Leadership changes or key announcements
4. Financial performance updates
5. Industry challenges or opportunities they're facing
6. How these developments create sales opportunities
7. Recommended talking points for outreach

Focus on information that would be relevant for sales conversations and relationship building.`,
      fields: [
        {
          id: 'companyName',
          label: 'Company Name',
          type: 'text',
          placeholder: 'Enter the company name',
          required: true
        }
      ]
    },
    {
      id: 'job-openings',
      title: 'Identify relevant job openings',
      description: 'Determine if the target company has open jobs that align to your value proposition.',
      category: 'analysis',
      icon: Search,
      prompt: `Research current job openings at a target company to identify sales opportunities.

Company Name: {companyName}
Product/Service: {productService}
Specific Roles/Departments: {targetRoles}

Please analyze:
1. Current job openings that indicate growth or pain points
2. How these openings suggest needs for our solution
3. Departments that are hiring and their potential challenges
4. Growth areas where our product/service could provide value
5. Key hiring managers or department heads to target
6. Timing considerations based on hiring patterns
7. Recommended talking points for outreach

Use my CRM data to reference similar hiring patterns and successful strategies.`,
      fields: [
        {
          id: 'companyName',
          label: 'Company Name',
          type: 'text',
          placeholder: 'Enter the target company name',
          required: true
        },
        {
          id: 'productService',
          label: 'Your Product/Service',
          type: 'textarea',
          placeholder: 'Describe what you are selling and its key benefits',
          required: true
        },
        {
          id: 'targetRoles',
          label: 'Specific Roles/Departments (Optional)',
          type: 'text',
          placeholder: 'e.g., Sales, Marketing, IT, Operations',
          required: false
        }
      ]
    },
    {
      id: 'identify-competitors',
      title: 'Identify competitors',
      description: 'Find competitors of your target account.',
      category: 'analysis',
      icon: Target,
      prompt: `Help me identify and analyze the competitive landscape for a target company.

Target Company: {companyName}
Industry/Sector: {industry}
Our Product/Service: {productService}

Please provide:
1. Main direct competitors
2. Indirect competitors and alternative solutions
3. Competitive positioning and market share
4. Strengths and weaknesses of each competitor
5. How our solution compares to their current options
6. Competitive advantages we can highlight
7. Potential objections based on competitor offerings
8. Strategic approach to position against competition

Use my CRM data to reference similar competitive situations we've encountered and successful strategies.`,
      fields: [
        {
          id: 'companyName',
          label: 'Target Company Name',
          type: 'text',
          placeholder: 'Enter the target company name',
          required: true
        },
        {
          id: 'industry',
          label: 'Industry/Sector',
          type: 'text',
          placeholder: 'e.g., Technology, Healthcare, Manufacturing',
          required: false
        },
        {
          id: 'productService',
          label: 'Our Product/Service',
          type: 'textarea',
          placeholder: 'Describe what you are selling and its key benefits',
          required: true
        }
      ]
    },
    {
      id: 'product-industry-insights',
      title: 'Summarize product and industry insights',
      description: 'Uncover product names, pricing, and industry insights for key accounts. Template by Carol Olona at LeadMinders.',
      category: 'analysis',
      icon: BarChart3,
      prompt: `Research and summarize product offerings, pricing models, and industry insights for a target company.

Company Name: {companyName}
Industry Focus: {industry}
Specific Areas of Interest: {focusAreas}

Please provide:
1. Main products/services they offer
2. Pricing strategies and models
3. Market position and competitive landscape
4. Industry trends affecting their business
5. Recent product launches or updates
6. Customer segments and target markets
7. Revenue streams and business model
8. Opportunities for our solution integration

Focus on actionable insights that could help position our {productService} effectively.`,
      fields: [
        {
          id: 'companyName',
          label: 'Company Name',
          type: 'text',
          placeholder: 'Enter the company name to research',
          required: true
        },
        {
          id: 'industry',
          label: 'Industry Focus',
          type: 'text',
          placeholder: 'e.g., SaaS, E-commerce, Healthcare',
          required: false
        },
        {
          id: 'focusAreas',
          label: 'Specific Areas of Interest',
          type: 'textarea',
          placeholder: 'e.g., pricing models, new products, market expansion',
          required: false
        },
        {
          id: 'productService',
          label: 'Our Product/Service',
          type: 'text',
          placeholder: 'What are you selling?',
          required: true
        }
      ]
    },
    {
      id: 'target-market-analysis',
      title: 'Identify who your target company sells to',
      description: 'Determine the target market and ICP of your target customer.',
      category: 'research',
      icon: UserCheck,
      prompt: `Analyze a target company to identify their target market and ideal customer profile (ICP).

Company Name: {companyName}
Industry: {industry}
Our Product/Service: {productService}

Please research and provide:
1. Their primary target market and customer segments
2. Ideal customer profile (company size, industry, role)
3. Customer demographics and characteristics
4. Market focus (geographic, vertical, horizontal)
5. Customer acquisition strategies they use
6. How understanding their customers helps position our solution
7. Potential synergies between their customers and our offering
8. Recommended approach for partnership or collaboration

Use my CRM data to identify similar customer patterns and successful strategies.`,
      fields: [
        {
          id: 'companyName',
          label: 'Target Company Name',
          type: 'text',
          placeholder: 'Enter the company name to analyze',
          required: true
        },
        {
          id: 'industry',
          label: 'Industry',
          type: 'text',
          placeholder: 'e.g., Technology, Healthcare, Financial Services',
          required: false
        },
        {
          id: 'productService',
          label: 'Our Product/Service',
          type: 'textarea',
          placeholder: 'Describe what you are selling and how it might relate to their customers',
          required: true
        }
      ]
    },
    {
      id: 'executive-changes',
      title: 'Know if a company had executive changes',
      description: 'Segment companies based on whether there have been recent changes on their executive team.',
      category: 'research',
      icon: Users,
      prompt: `Research recent executive changes at a target company to identify sales opportunities.

Company Name: {companyName}
Time Period: {timePeriod}
Our Product/Service: {productService}
Specific Departments of Interest: {departments}

Please analyze:
1. Recent executive changes (last 6 months or specified period)
2. New hires, departures, promotions, or organizational restructuring
3. Impact of these changes on business priorities
4. New initiatives or strategic shifts indicated by changes
5. Opportunities these changes create for our solution
6. Key contacts to target based on new leadership
7. Timing considerations for outreach
8. Recommended messaging based on transition dynamics

Use my CRM data to reference similar executive change scenarios and successful strategies.`,
      fields: [
        {
          id: 'companyName',
          label: 'Company Name',
          type: 'text',
          placeholder: 'Enter the company name to research',
          required: true
        },
        {
          id: 'timePeriod',
          label: 'Time Period',
          type: 'text',
          placeholder: 'e.g., last 6 months, last year, since January 2024',
          required: false
        },
        {
          id: 'productService',
          label: 'Our Product/Service',
          type: 'textarea',
          placeholder: 'Describe what you are selling',
          required: true
        },
        {
          id: 'departments',
          label: 'Specific Departments of Interest',
          type: 'text',
          placeholder: 'e.g., Sales, Marketing, IT, Operations, C-Suite',
          required: false
        }
      ]
    },
    {
      id: 'account-summary',
      title: 'General sales-focused account summary',
      description: 'Generate a general, sales-focused summary of a company to support outreach.',
      category: 'strategy',
      icon: Briefcase,
      prompt: `Create a comprehensive sales-focused summary of a target company.

Company Name: {companyName}
Industry: {industry}
Our Product/Service: {productService}
Specific Focus Areas: {focusAreas}

Please provide a comprehensive analysis including:
1. Business model and revenue streams
2. Key challenges and pain points
3. Growth initiatives and strategic priorities
4. Recent developments and news
5. Market position and competitive landscape
6. Decision-making structure and key stakeholders
7. Potential opportunities for our solution
8. Recommended outreach strategy and messaging
9. Timing considerations and next steps

Focus on actionable insights that will support effective sales outreach and relationship building.`,
      fields: [
        {
          id: 'companyName',
          label: 'Company Name',
          type: 'text',
          placeholder: 'Enter the target company name',
          required: true
        },
        {
          id: 'industry',
          label: 'Industry',
          type: 'text',
          placeholder: 'e.g., Technology, Healthcare, Manufacturing',
          required: false
        },
        {
          id: 'productService',
          label: 'Our Product/Service',
          type: 'textarea',
          placeholder: 'Describe what you are selling and its key benefits',
          required: true
        },
        {
          id: 'focusAreas',
          label: 'Specific Focus Areas',
          type: 'textarea',
          placeholder: 'e.g., digital transformation, cost reduction, growth initiatives',
          required: false
        }
      ]
    },
    {
      id: 'pre-construction-projects',
      title: 'Identify pre-construction projects',
      description: 'Discover real estate pre-construction projects by scanning recent news and product updates. Template by Dahra at Outer Realm.',
      category: 'research',
      icon: Construction,
      prompt: `Research and identify pre-construction real estate projects for sales opportunities.

Company/Developer Name: {companyName}
Geographic Area: {location}
Project Type: {projectType}
Our Product/Service: {productService}

Please research and identify:
1. Pre-construction real estate projects in the specified area
2. New developments and construction announcements
3. Zoning approvals and building permits
4. Developer information and key contacts
5. Project timelines and phases
6. Opportunities for our solution in these projects
7. Key decision-makers and stakeholders
8. Recommended approach and timing for outreach

Focus on projects where our {productService} could provide value during the pre-construction or construction phases.`,
      fields: [
        {
          id: 'companyName',
          label: 'Company/Developer Name',
          type: 'text',
          placeholder: 'Enter the company or developer name (optional)',
          required: false
        },
        {
          id: 'location',
          label: 'Geographic Area',
          type: 'text',
          placeholder: 'e.g., Downtown Seattle, Orange County, Manhattan',
          required: true
        },
        {
          id: 'projectType',
          label: 'Project Type',
          type: 'text',
          placeholder: 'e.g., Commercial, Residential, Mixed-use, Industrial',
          required: false
        },
        {
          id: 'productService',
          label: 'Our Product/Service',
          type: 'textarea',
          placeholder: 'Describe what you are selling and how it relates to construction projects',
          required: true
        }
      ]
    }
  ];

  const filteredTemplates = aiTemplates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTryTemplate = (template: AITemplate) => {
    setSelectedTemplate(template);
    
    if (template.fields && template.fields.length > 0) {
      // Show form dialog for templates with fields
      setTemplateFormData({});
      setShowTemplateForm(true);
    } else {
      // Direct to ChatCRM for templates without fields
      setActiveMode('chatcrm');
      setShowChatCRM(true);
      setInitialMessage(template.prompt);
    }
    
    toast({
      title: "Template selected",
      description: `${template.title} template loaded.`,
    });
  };

  const handleOpenChatCRM = () => {
    setShowChatCRM(true);
    if (!selectedTemplate) {
      setInitialMessage('');
    }
  };

  const handleCloseChatCRM = (open: boolean) => {
    setShowChatCRM(open);
    if (!open) {
      setInitialMessage('');
      setSelectedTemplate(null);
    }
  };

  const handleTemplateFormSubmit = () => {
    if (!selectedTemplate) return;

    // Check required fields
    const missingFields = selectedTemplate.fields?.filter(field => 
      field.required && !templateFormData[field.id]?.trim()
    ) || [];

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Replace placeholders in prompt with actual values
    let finalPrompt = selectedTemplate.prompt;
    Object.entries(templateFormData).forEach(([key, value]) => {
      finalPrompt = finalPrompt.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    // Close form and open ChatCRM
    setShowTemplateForm(false);
    setActiveMode('chatcrm');
    setShowChatCRM(true);
    setInitialMessage(finalPrompt);

    toast({
      title: "Template ready",
      description: "Your customized template is ready in ChatCRM!",
    });
  };

  const handleFormFieldChange = (fieldId: string, value: string) => {
    setTemplateFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card key={template.id} className="border border-slate-200 hover:shadow-md transition-shadow">
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
      <ChatCRM open={showChatCRM} onOpenChange={handleCloseChatCRM} initialMessage={initialMessage} />
      
      {/* Template Form Dialog */}
      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
              {selectedTemplate?.title}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to customize your template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedTemplate?.fields?.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.type === 'text' ? (
                  <Input
                    id={field.id}
                    placeholder={field.placeholder}
                    value={templateFormData[field.id] || ''}
                    onChange={(e) => handleFormFieldChange(field.id, e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <Textarea
                    id={field.id}
                    placeholder={field.placeholder}
                    value={templateFormData[field.id] || ''}
                    onChange={(e) => handleFormFieldChange(field.id, e.target.value)}
                    className="w-full min-h-[80px] resize-none"
                  />
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTemplateForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTemplateFormSubmit}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Send to ChatCRM
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIAssistant; 