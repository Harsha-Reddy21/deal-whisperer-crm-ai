import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Paperclip, X, Sparkles, User, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateEmailContent, isOpenAIConfigured, EmailGenerationRequest } from '@/lib/openai';

const ComposeEmail = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
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
        console.log('No profile found, using user email data');
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

  // Get selected contact/lead details
  const selectedContact = contacts.find(c => c.id === selectedContactId) || 
                         leads.find(l => l.id === selectedContactId);

  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: typeof formData) => {
      // Track the email in our database
      const { data, error } = await supabase
        .from('email_tracking')
        .insert({
          user_id: user?.id,
          contact_id: selectedContactId || null,
          email_id: `email_${Date.now()}`,
          subject: emailData.subject,
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create an activity record
      await supabase
        .from('activities')
        .insert({
          user_id: user?.id,
          contact_id: selectedContactId || null,
          type: 'email',
          subject: `Email sent: ${emailData.subject}`,
          description: `Sent email to ${emailData.to}`,
          status: 'completed'
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['email-tracking'] });
      resetForm();
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

  const resetForm = () => {
    setFormData({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: ''
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
      
      // Directly paste the generated content to the message field
      setFormData(prev => ({ ...prev, body: response.content }));
      
      toast({
        title: "Message generated",
        description: "AI-generated content has been added to the message field. You can now edit it as needed.",
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
      setFormData(prev => ({ ...prev, to: contact.email }));
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
    if (!formData.to || !formData.subject || !formData.body) {
      toast({
        title: "Missing required fields",
        description: "Please fill in recipient, subject, and message body.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate(formData);
  };

  const openAIConfigured = isOpenAIConfigured();

  // Combine contacts and leads for selection
  const allRecipients = [
    ...contacts.map(c => ({ ...c, type: 'contact' })),
    ...leads.map(l => ({ ...l, type: 'lead' }))
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2 text-blue-600" />
            Compose Email
          </CardTitle>
          <CardDescription>
            Create and send emails with AI-generated content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient Selection */}
            <div className="space-y-4">
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
                  value={formData.to}
                  onChange={(e) => setFormData(prev => ({ ...prev, to: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CC</label>
                  <Input
                    placeholder="cc@example.com"
                    value={formData.cc}
                    onChange={(e) => setFormData(prev => ({ ...prev, cc: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">BCC</label>
                  <Input
                    placeholder="bcc@example.com"
                    value={formData.bcc}
                    onChange={(e) => setFormData(prev => ({ ...prev, bcc: e.target.value }))}
                  />
                </div>
              </div>
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
                className="min-h-[300px]"
                value={formData.body}
                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                required
              />
              {!openAIConfigured && (
                <p className="text-xs text-amber-600">
                  OpenAI API key not configured. AI message generation unavailable.
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
              <Button type="button" variant="outline" onClick={resetForm}>
                Clear Form
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ComposeEmail; 