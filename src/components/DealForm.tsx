import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDealCreated: () => void;
}

const DealForm = ({ open, onOpenChange, onDealCreated }: DealFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    value: '',
    stage: 'Discovery',
    contact_id: '',
    contact_name: '',
    next_step: '',
    deal_status: 'in_progress'
  });

  // Fetch contacts for dropdown
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-deal', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, company')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.contact_id) {
      toast({
        title: "Error",
        description: "Contact is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, check if company exists and create it if needed
      if (formData.company.trim()) {
        // Check if company already exists
        const { data: existingCompanies, error: companyCheckError } = await supabase
          .from('companies')
          .select('id')
          .eq('name', formData.company.trim())
          .eq('user_id', user.id)
          .limit(1);
          
        if (companyCheckError) throw companyCheckError;
        
        // If company doesn't exist, create it
        if (!existingCompanies || existingCompanies.length === 0) {
          const { error: companyCreateError } = await supabase
            .from('companies')
            .insert({
              user_id: user.id,
              name: formData.company.trim(),
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (companyCreateError) throw companyCreateError;
          
          console.log(`Created new company: ${formData.company.trim()}`);
        }
      }

      // Now create the deal
      const { error } = await supabase
        .from('deals')
        .insert({
          user_id: user.id,
          title: formData.title,
          company: formData.company,
          value: parseFloat(formData.value) || 0,
          stage: formData.stage,
          contact_id: formData.contact_id,
          contact_name: formData.contact_name,
          next_step: formData.next_step,
          outcome: formData.deal_status
        });

      if (error) throw error;

      toast({
        title: "Deal created!",
        description: "Your new deal has been added to the pipeline.",
      });

      // Reset form
      setFormData({
        title: '',
        company: '',
        value: '',
        stage: 'Discovery',
        contact_id: '',
        contact_name: '',
        next_step: '',
        deal_status: 'in_progress'
      });

      onDealCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error creating deal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (contactId: string) => {
    const selectedContact = contacts.find(contact => contact.id === contactId);
    setFormData(prev => ({ 
      ...prev, 
      contact_id: contactId,
      contact_name: selectedContact ? selectedContact.name : '',
      company: selectedContact && selectedContact.company ? selectedContact.company : prev.company
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Deal</DialogTitle>
          <DialogDescription>
            Create a new deal in your sales pipeline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Deal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enterprise Software Deal"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contact">Contact *</Label>
            <Select 
              value={formData.contact_id} 
              onValueChange={handleContactChange}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name} {contact.company && `(${contact.company})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Acme Corp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Deal Value</Label>
              <Input
                id="value"
                type="number"
                value={formData.value}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="50000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select value={formData.stage} onValueChange={(value) => handleChange('stage', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Discovery">Discovery</SelectItem>
                  <SelectItem value="Proposal">Proposal</SelectItem>
                  <SelectItem value="Negotiation">Negotiation</SelectItem>
                  <SelectItem value="Closing">Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal_status">Deal Status</Label>
              <Select value={formData.deal_status} onValueChange={(value) => handleChange('deal_status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_step">Next Step</Label>
            <Textarea
              id="next_step"
              value={formData.next_step}
              onChange={(e) => handleChange('next_step', e.target.value)}
              placeholder="Schedule discovery call"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DealForm;
