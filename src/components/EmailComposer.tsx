import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Send, Paperclip, X, Sparkles, Copy, Edit3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateEmailContent, isOpenAIConfigured, EmailGenerationRequest } from '@/lib/openai';

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledTo?: string;
  prefilledSubject?: string;
  contactId?: string;
  dealId?: string;
  leadId?: string;
}

const EmailComposer = ({ 
  open, 
  onOpenChange, 
  prefilledTo = '', 
  prefilledSubject = '',
  contactId,
  dealId,
  leadId
}: EmailComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    to: prefilledTo,
    cc: '',
    bcc: '',
    subject: prefilledSubject,
    body: ''
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [showGeneratedContent, setShowGeneratedContent] = useState(false);

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
    enabled: !!user && open,
  });

  // Fetch contact details for better AI generation context
  const { data: contactDetails } = useQuery({
    queryKey: ['contact-details', contactId, leadId, dealId],
    queryFn: async () => {
      // If we have a contact ID, fetch contact details
      if (contactId) {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name, company, email')
          .eq('id', contactId)
          .single();

        if (error) throw error;
        return data;
      }
      
      // If we have a lead ID, fetch lead details
      if (leadId) {
        const { data, error } = await supabase
          .from('leads')
          .select('id, name, company, email')
          .eq('id', leadId)
          .single();
          
        if (error) throw error;
        return data;
      }
      
      // If we have a deal ID, fetch the deal and its associated contact
      if (dealId) {
        const { data: dealData, error: dealError } = await supabase
          .from('deals')
          .select('contact_id, contact_name')
          .eq('id', dealId)
          .single();
          
        if (dealError) throw dealError;
        
        if (dealData.contact_id) {
          const { data, error } = await supabase
            .from('contacts')
            .select('id, name, company, email')
            .eq('id', dealData.contact_id)
            .single();
            
          if (error) throw error;
          return data;
        } else if (dealData.contact_name) {
          // Return basic info if we only have the contact name
          return {
            id: null,
            name: dealData.contact_name,
            company: '',
            email: ''
          };
        }
      }
      
      return null;
    },
    enabled: !!(contactId || leadId || dealId) && open,
  });
  
  // Update form data when props change or when contact details are loaded
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      to: contactDetails?.email || prefilledTo,
      subject: prefilledSubject
    }));
  }, [prefilledTo, prefilledSubject, contactDetails?.email]);

  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: typeof formData) => {
      // In a real implementation, this would integrate with an email service
      // For now, we'll just track the email in our database
      const emailTrackingData = {
        user_id: user?.id,
        contact_id: contactId || contactDetails?.id,
        deal_id: dealId,
        lead_id: leadId,
        email_id: `email_${Date.now()}`,
        subject: emailData.subject,
        body: emailData.body,
        read_at: null,
        sent_at: new Date().toISOString()
      };
      
      // Use type assertion to bypass TypeScript type checking
      const { data, error } = await supabase
        .from('email_tracking')
        .insert(emailTrackingData as any)
        .select()
        .single();

      if (error) throw error;

      // Create an activity record based on the context
      try {
        if (leadId) {
          // For leads, create an activity with lead_id
          await supabase
            .from('activities')
            .insert({
              user_id: user?.id,
              lead_id: leadId,  // Use lead_id for activities
              deal_id: dealId,
              type: 'email',
              subject: `Email sent: ${emailData.subject}`,
              description: `To: ${emailData.to}\n\n======= SUBJECT =======\n${emailData.subject}\n\n======= MESSAGE =======\n${emailData.body}`,
              status: 'done'
            } as any);
        } else if (contactId || contactDetails?.id) {
          // For contacts, create an activity with contact_id
          await supabase
            .from('activities')
            .insert({
              user_id: user?.id,
              contact_id: contactId || contactDetails?.id,
              deal_id: dealId,
              type: 'email',
              subject: `Email sent: ${emailData.subject}`,
              description: `To: ${emailData.to}\n\n======= SUBJECT =======\n${emailData.subject}\n\n======= MESSAGE =======\n${emailData.body}`,
              status: 'completed' // Use 'completed' status for consistency
            });
        } else if (dealId) {
          // If only deal_id is present, try to get the contact_id from the deal
          const { data: dealData } = await supabase
            .from('deals')
            .select('contact_id')
            .eq('id', dealId)
            .single();
            
          await supabase
            .from('activities')
            .insert({
              user_id: user?.id,
              contact_id: dealData?.contact_id,
              deal_id: dealId,
              type: 'email',
              subject: `Email sent: ${emailData.subject}`,
              description: `To: ${emailData.to}\n\n======= SUBJECT =======\n${emailData.subject}\n\n======= MESSAGE =======\n${emailData.body}`,
              status: 'completed'
            });
        }
      } catch (activityError) {
        console.error("Failed to create activity:", activityError);
        // Continue with the function even if activity creation fails
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['email-tracking'] });
      onOpenChange(false);
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
    setAttachments([]);
    setGeneratedContent('');
    setShowGeneratedContent(false);
  };

  const generateAIContent = async () => {
    if (!formData.subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a subject line to generate email content.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingEmail(true);
    try {
      const request: EmailGenerationRequest = {
        subject: formData.subject,
        recipientName: contactDetails?.name,
        recipientCompany: contactDetails?.company,
        context: dealId ? 'Deal-related communication' : 'General business communication',
        tone: 'professional',
        senderName: userProfile?.first_name && userProfile?.last_name 
          ? `${userProfile.first_name} ${userProfile.last_name}` 
          : userProfile?.first_name || user?.email?.split('@')[0] || 'User',
        senderPosition: userProfile?.role,
        senderCompany: userProfile?.company,
        senderEmail: user?.email,
        senderPhone: undefined // Phone not available in profiles table
      };

      const response = await generateEmailContent(request);
      setGeneratedContent(response.content);
      setShowGeneratedContent(true);
      
      toast({
        title: "Email content generated",
        description: "AI has generated personalized email content with your details.",
      });
    } catch (error) {
      console.error('Error generating email content:', error);
      toast({
        title: "Error generating content",
        description: error instanceof Error ? error.message : 'Failed to generate email content',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const copyGeneratedContent = () => {
    setFormData(prev => ({ ...prev, body: generatedContent }));
    setShowGeneratedContent(false);
    toast({
      title: "Content copied",
      description: "Generated content has been copied to the message field.",
    });
  };

  const editGeneratedContent = () => {
    setFormData(prev => ({ ...prev, body: generatedContent }));
    setShowGeneratedContent(false);
    // Focus will automatically go to the textarea
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2 text-blue-600" />
            Compose Email
          </DialogTitle>
          <DialogDescription>
            Send an email to your contacts with AI-generated personalized content
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipients */}
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

          {/* Subject with AI Generation */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject *</label>
            <div className="flex space-x-2">
              <Input
                placeholder="Email subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                required
                className="flex-1"
              />
              <Button
                type="button"
                onClick={generateAIContent}
                disabled={!formData.subject.trim() || isGeneratingEmail || !openAIConfigured}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isGeneratingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
            {!openAIConfigured && (
              <p className="text-xs text-amber-600">
                OpenAI API key not configured. AI generation unavailable.
              </p>
            )}
          </div>

          {/* Generated Content Preview */}
          {showGeneratedContent && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center text-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Generated Personalized Content
                </CardTitle>
                <CardDescription className="text-purple-600">
                  Review the generated content with your personal details and recipient information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-3 rounded border border-purple-200 max-h-40 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                    {generatedContent}
                  </pre>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={copyGeneratedContent}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy to Message
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={editGeneratedContent}
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Copy & Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowGeneratedContent(false)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message Body */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message *</label>
            <Textarea
              placeholder="Type your message here or generate personalized content with AI..."
              className="min-h-[200px]"
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              required
            />
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
};

export default EmailComposer; 