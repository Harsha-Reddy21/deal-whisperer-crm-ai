import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Mail, 
  Send, 
  Paperclip, 
  X, 
  Sparkles, 
  User, 
  Building2, 
  Inbox, 
  Archive, 
  Trash2, 
  Star, 
  Reply, 
  Forward,
  Search,
  Plus,
  RefreshCw,
  Brain,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  generateEmailContent, 
  isOpenAIConfigured, 
  EmailGenerationRequest,
  summarizeEmails,
  EmailSummaryRequest,
  EmailSummaryResponse
} from '@/lib/ai';

interface Email {
  id: string;
  subject: string;
  recipient: string;
  sent_at: string;
  status: string;
  contact_id?: string;
  contact_name?: string;
  lead_id?: string;
  message: string;
  deal_info: string;
  importance?: string;
  folder: string;
  type: string;
}

const EmailManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeView, setActiveView] = useState<'inbox' | 'sent'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [emailSummary, setEmailSummary] = useState<EmailSummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Compose form state
  const [formData, setFormData] = useState({
    subject: '',
    recipient: '',
    message: '',
    contact_id: null,
    send_date: '',
    importance: 'normal'
  });
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // Fetch user profile for signature details
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, company, role, email')
        .eq('id', user.id)
        .single();

      if (error) {
        return {
          first_name: user.email?.split('@')[0] || 'User',
          last_name: null,
          company: null,
          role: null,
          email: user.email
        };
      }
      return data;
    },
    enabled: !!user,
  });

  // Fetch contacts for recipient selection
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, company')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch leads for recipient selection
  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, company')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Filter emails based on active view and search
  const { data: allEmailsData = [], refetch: refetchEmails } = useQuery({
    queryKey: ['emails', user?.id, activeView],
    queryFn: async () => {
      if (!user) return [];

      // Fetch emails from the database (email_tracking table)
      const { data, error } = await supabase
        .from('email_tracking')
        .select('*, deals(title, company)')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading emails",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      // Remove any mock or sample data
      // Filter out emails with sample email_id
      const realEmails = data.filter(email => !email.email_id.startsWith('sample_'));

      // Extract all contact_ids and lead_ids for name lookups
      const contactIds = realEmails
        .filter(email => email.contact_id)
        .map(email => email.contact_id);
      
      // Type assertion to access lead_id
      const typedData = realEmails as any[];
      const leadIds = typedData
        .filter(email => email.lead_id)
        .map(email => email.lead_id);

      // Fetch contact details
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, name, email')
        .in('id', contactIds);

      // Fetch lead details
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, name, email')
        .in('id', leadIds);

      // Create maps for quick lookup
      const contactsMap = new Map(contactsData?.map(c => [c.id, c]) || []);
      const leadsMap = new Map(leadsData?.map(l => [l.id, l]) || []);

      // Map the email_tracking records to the interface we need
      return typedData.map(email => {
        let recipientName = 'Unknown';
        let recipientEmail = '';
        
        // Determine recipient based on contact_id or lead_id
        if (email.contact_id && contactsMap.has(email.contact_id)) {
          const contact = contactsMap.get(email.contact_id);
          recipientName = contact.name;
          recipientEmail = contact.email;
        } else if (email.lead_id && leadsMap.has(email.lead_id)) {
          const lead = leadsMap.get(email.lead_id);
          recipientName = lead.name;
          recipientEmail = lead.email;
        }
        
        return {
          id: email.id,
          subject: email.subject || 'No Subject',
          recipient: recipientEmail || 'No recipient',
          sent_at: email.sent_at,
          status: email.read_at ? 'read' : 'unread',
          contact_id: email.contact_id,
          lead_id: email.lead_id,
          contact_name: recipientName,
          message: email.body || '',
          deal_info: email.deals ? `${email.deals.title} - ${email.deals.company}` : '',
          folder: email.folder,
          type: email.type
        } as Email;
      });
    },
    enabled: !!user,
  });

  // Filter emails based on active view and search
  const filteredEmails = allEmailsData.filter(email => {
    // Filter based on type (inbox or sent)
    if (activeView === 'inbox' && email.type !== 'received') return false;
    if (activeView === 'sent' && email.type !== 'sent') return false;
    
    // Filter by search query
    if (searchQuery === '') return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(searchLower) ||
      (email.contact_name && email.contact_name.toLowerCase().includes(searchLower))
    );
  });

  // Get unread emails for summary (only for inbox view)
  const unreadEmails = activeView === 'inbox' 
    ? filteredEmails.filter(email => email.status === 'unread')
    : [];

  // Mutation to mark email as read
  const markAsReadMutation = useMutation({
    mutationFn: async (emailId: string) => {
      // Direct update using type assertion for the new field
      const { error } = await supabase
        .from('email_tracking')
        .update({ read_at: new Date().toISOString() } as any)
        .eq('id', emailId)
        .eq('user_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (error: any) => {
      console.error('Error marking email as read:', error);
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: typeof formData) => {
      try {
        // Use only fields that exist in the schema
        const emailTrackingData = {
          user_id: user?.id,
          contact_id: emailData.contact_id || null,
          email_id: `email_${Date.now()}`, // This is required
          subject: emailData.subject,
          body: emailData.message,
          type: 'sent',
          sent_at: new Date().toISOString()
        };
        
        console.log('Sending email with data:', emailTrackingData);

        // Track the email in our database with type assertion for new fields
        const { data, error } = await supabase
          .from('email_tracking')
          .insert(emailTrackingData)
          .select()
          .single();

        if (error) {
          console.error("Error sending email:", error);
          throw new Error(`Failed to send email: ${error.message}`);
        }

        // Create an activity record
        await supabase
          .from('activities')
          .insert({
            user_id: user?.id,
            contact_id: emailData.contact_id || null,
            type: 'email',
            subject: `Email sent: ${emailData.subject}`,
            description: `Sent email to ${emailData.recipient}`,
            status: 'completed'
          });

        return data;
      } catch (error) {
        console.error('Error sending email:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      refetchEmails();
      resetComposeForm();
      setShowComposeDialog(false);
      setActiveView('sent');
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending email",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const generateEmailSummary = async (summaryType: 'unread' | 'all' | 'single', targetEmail?: Email) => {
    if (!isOpenAIConfigured()) {
      toast({
        title: "AI not configured",
        description: "OpenAI API key not configured. Please check your settings.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingSummary(true);
    try {
      let emailsToSummarize: Email[] = [];
      let requestType: EmailSummaryRequest['summaryType'] = 'unread';

      if (summaryType === 'single' && targetEmail) {
        emailsToSummarize = [targetEmail];
        requestType = 'single';
      } else if (summaryType === 'unread') {
        emailsToSummarize = unreadEmails;
        requestType = 'unread';
      } else {
        emailsToSummarize = filteredEmails.slice(0, 20); // Limit to recent 20 emails
        requestType = 'daily';
      }

      if (emailsToSummarize.length === 0) {
        toast({
          title: "No emails to summarize",
          description: summaryType === 'unread' ? "You have no unread emails." : "No emails found.",
        });
        return;
      }

      const request: EmailSummaryRequest = {
        emails: emailsToSummarize.map(email => ({
          id: email.id,
          subject: email.subject,
          from_email: email.recipient, // Map recipient to from_email for the API
          from_name: email.contact_name || 'Unknown',
          body_text: email.message || '',
          received_at: email.sent_at,
          status: email.status,
          priority: email.importance || 'normal'
        })),
        summaryType: requestType,
        userPreferences: {
          tone: 'detailed',
          includeActions: true,
          focusAreas: ['urgent', 'partnerships', 'contracts', 'meetings']
        }
      };

      const summary = await summarizeEmails(request);
      setEmailSummary(summary);
      setShowSummaryDialog(true);

      toast({
        title: "Summary generated",
        description: `AI summary created for ${emailsToSummarize.length} emails.`,
      });
    } catch (error) {
      console.error('Error generating email summary:', error);
      toast({
        title: "Error generating summary",
        description: error instanceof Error ? error.message : 'Failed to generate email summary',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const resetComposeForm = () => {
    setFormData({
      subject: '',
      recipient: '',
      message: '',
      contact_id: null,
      send_date: '',
      importance: 'normal'
    });
    setSelectedContactId('');
    setAttachments([]);
  };

  const generateMessage = async () => {
    if (!formData.subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a subject line to generate email content.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingMessage(true);
    try {
      const selectedContact = contacts.find(c => c.id === selectedContactId) || 
                             leads.find(l => l.id === selectedContactId);

      const request: EmailGenerationRequest = {
        subject: formData.subject,
        recipientName: selectedContact?.name,
        recipientCompany: selectedContact?.company,
        context: 'General business communication',
        tone: 'professional',
        senderName: userProfile?.first_name && userProfile?.last_name 
          ? `${userProfile.first_name} ${userProfile.last_name}` 
          : userProfile?.first_name || user?.email?.split('@')[0] || 'User',
        senderPosition: userProfile?.role,
        senderCompany: userProfile?.company,
        senderEmail: user?.email,
        senderPhone: undefined
      };

      const response = await generateEmailContent(request);
      setFormData(prev => ({ ...prev, message: response.content }));
      
      toast({
        title: "Message generated",
        description: "AI-generated content has been added to the message field.",
      });
    } catch (error) {
      console.error('Error generating message:', error);
      toast({
        title: "Error generating message",
        description: error instanceof Error ? error.message : 'Failed to generate message content',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    const contact = contacts.find(c => c.id === contactId) || leads.find(l => l.id === contactId);
    if (contact?.email) {
      setFormData(prev => ({ ...prev, recipient: contact.email }));
    }
  };

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipient || !formData.subject || !formData.message) {
      toast({
        title: "Missing required fields",
        description: "Please fill in recipient, subject, and message body.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate(formData);
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    
    // Mark as read if it's unread and in inbox view
    if (email.status === 'unread' && activeView === 'inbox') {
      markAsReadMutation.mutate(email.id);
    }
  };

  const openAIConfigured = isOpenAIConfigured();
  const allRecipients = [
    ...contacts.map(c => ({ ...c, type: 'contact' })),
    ...leads.map(l => ({ ...l, type: 'lead' }))
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <CardTitle>Emails</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {unreadEmails.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => generateEmailSummary('unread')}
                  disabled={isGeneratingSummary || !openAIConfigured}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {isGeneratingSummary ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></div>
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-1" />
                      Summarize Unread ({unreadEmails.length})
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => generateEmailSummary('all')}
                disabled={isGeneratingSummary || !openAIConfigured}
                variant="outline"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Summarize All
              </Button>
              <Button
                size="sm"
                onClick={() => refetchEmails()}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setShowComposeDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                Compose
              </Button>
            </div>
          </div>
          <CardDescription>
            Manage your emails with AI-powered composition and summarization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[600px]">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-200 pr-4">
              <div className="space-y-2">
                <Button
                  variant={activeView === 'inbox' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveView('inbox')}
                >
                  <Inbox className="w-4 h-4 mr-2" />
                  Inbox
                  <Badge variant="secondary" className="ml-auto">
                    {unreadEmails.length}
                  </Badge>
                </Button>
                <Button
                  variant={activeView === 'sent' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveView('sent')}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Sent
                  <Badge variant="secondary" className="ml-auto">
                    {allEmailsData.length - unreadEmails.length}
                  </Badge>
                </Button>
              </div>
              
              <Separator className="my-4" />
              
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Email List */}
            <div className="flex-1 pl-4">
              <div className="space-y-2 max-h-full overflow-y-auto">
                {filteredEmails.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Mail className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No emails found</p>
                    {activeView === 'inbox' && (
                      <p className="text-sm mt-2">Your inbox emails will appear here</p>
                    )}
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedEmail?.id === email.id
                          ? 'bg-blue-50 border-blue-200'
                          : email.status === 'unread'
                          ? 'bg-blue-25 hover:bg-blue-50 font-medium border-blue-100'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => handleEmailClick(email)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {email.status === 'starred' && <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                          <span className={`truncate ${email.status === 'unread' ? 'font-semibold' : ''}`}>
                            {email.recipient}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {formatDate(email.sent_at)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className={`text-sm truncate ${email.status === 'unread' ? 'font-semibold' : 'text-slate-600'}`}>
                          {email.subject}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Detail View */}
      {selectedEmail && (
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center">
                  {selectedEmail.subject}
                  {selectedEmail.importance && selectedEmail.importance !== 'normal' && (
                    <Badge className={`ml-2 ${getPriorityColor(selectedEmail.importance)}`}>
                      {selectedEmail.importance}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center justify-between text-sm text-slate-600 mt-2">
                  <div>
                    <span className="font-medium">From:</span> {selectedEmail.contact_name || selectedEmail.recipient}
                  </div>
                  <div>
                    {formatDate(selectedEmail.sent_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {openAIConfigured && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => generateEmailSummary('single', selectedEmail)}
                    disabled={isGeneratingSummary}
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    Summarize
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <Reply className="w-4 h-4 mr-1" />
                  Reply
                </Button>
                <Button size="sm" variant="outline">
                  <Forward className="w-4 h-4 mr-1" />
                  Forward
                </Button>
                <Button size="sm" variant="outline">
                  <Archive className="w-4 h-4 mr-1" />
                  Archive
                </Button>
                <Button size="sm" variant="outline">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              {selectedEmail.message ? (
                <div className="whitespace-pre-wrap">{selectedEmail.message}</div>
              ) : (
                <div className="text-slate-500 italic">No content available</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              {emailSummary?.title || 'Email Summary'}
            </DialogTitle>
            <DialogDescription>
              AI-generated analysis and insights from your emails
            </DialogDescription>
          </DialogHeader>
          
          {emailSummary && (
            <div className="space-y-6">
              {/* Summary */}
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-slate-700">{emailSummary.summary}</p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{emailSummary.statistics.totalEmails}</div>
                  <div className="text-sm text-slate-600">Total Emails</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{emailSummary.statistics.unreadCount}</div>
                  <div className="text-sm text-slate-600">Unread</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{emailSummary.statistics.urgentCount}</div>
                  <div className="text-sm text-slate-600">Urgent</div>
                </div>
              </div>

              {/* Key Insights */}
              {emailSummary.keyInsights.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Key Insights</h3>
                  <ul className="space-y-1">
                    {emailSummary.keyInsights.map((insight, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <span className="text-slate-700">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {emailSummary.actionItems.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Action Items</h3>
                  <ul className="space-y-1">
                    {emailSummary.actionItems.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <span className="text-slate-700">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Priority Emails */}
              {emailSummary.priorityEmails.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Priority Emails</h3>
                  <div className="space-y-2">
                    {emailSummary.priorityEmails.map((email, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{email.subject}</p>
                            <p className="text-sm text-slate-600">From: {email.from}</p>
                          </div>
                          <Badge className={getPriorityColor(email.urgency)}>
                            {email.urgency}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{email.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {emailSummary.categories.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Email Categories</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {emailSummary.categories.map((category, index) => (
                      <div key={index} className="p-2 bg-slate-50 rounded">
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-slate-600">{category.count} emails</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Email Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-600" />
              Compose Email
            </DialogTitle>
            <DialogDescription>
              Create and send emails with AI-generated content
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Recipient Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Recipient (Optional)</label>
              <Select value={selectedContactId} onValueChange={handleContactSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose from your contacts or leads..." />
                </SelectTrigger>
                <SelectContent>
                  {allRecipients.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id}>
                      <div className="flex items-center space-x-2">
                        {recipient.type === 'contact' ? (
                          <User className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Building2 className="w-4 h-4 text-green-600" />
                        )}
                        <span>{recipient.name}</span>
                        {recipient.company && (
                          <span className="text-slate-500">- {recipient.company}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Fields */}
            <div className="space-y-2">
              <label className="text-sm font-medium">To *</label>
              <Input
                placeholder="recipient@example.com"
                value={formData.recipient}
                onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                required
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject *</label>
              <Input
                placeholder="Email subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                required
              />
            </div>

            {/* Message with AI Generation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Message *</label>
                <Button
                  type="button"
                  size="sm"
                  onClick={generateMessage}
                  disabled={!formData.subject.trim() || isGeneratingMessage || !openAIConfigured}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isGeneratingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Message
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                placeholder="Type your message here or click 'Generate Message' to create AI content..."
                className="min-h-[200px]"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                required
              />
              {!openAIConfigured && (
                <p className="text-xs text-amber-600">
                  OpenAI API key not configured. AI features unavailable.
                </p>
              )}
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Paperclip className="w-4 h-4 mr-1" />
                Attachments
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileAttachment}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowComposeDialog(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-blue-600 to-purple-600"
                disabled={sendEmailMutation.isPending}
              >
                {sendEmailMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailManager; 