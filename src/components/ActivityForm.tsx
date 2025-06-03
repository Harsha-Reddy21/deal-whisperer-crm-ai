import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivityCreated: () => void;
  initialDealId?: string; // Optional prop to pre-select a deal
}

const ActivityForm = ({ open, onOpenChange, onActivityCreated, initialDealId }: ActivityFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'call',
    subject: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    contact_id: '',
    deal_id: ''
  });

  // Use the initialDealId when the component opens
  useEffect(() => {
    if (open && initialDealId) {
      setFormData(prev => ({ ...prev, deal_id: initialDealId }));
      
      // If we have a deal ID, fetch and auto-select the associated contact
      if (user) {
        const fetchDealContact = async () => {
          try {
            const { data, error } = await supabase
              .from('deals')
              .select('contact_id')
              .eq('id', initialDealId)
              .single();
              
            if (error) throw error;
            if (data && data.contact_id) {
              setFormData(prev => ({ ...prev, contact_id: data.contact_id }));
            }
          } catch (error) {
            console.error('Error fetching deal contact:', error);
          }
        };
        
        fetchDealContact();
      }
    }
  }, [open, initialDealId, user]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        type: 'call',
        subject: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
        contact_id: '',
        deal_id: ''
      });
    }
  }, [open]);

  // Fetch contacts and deals for dropdowns
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-activity', user?.id],
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

  const { data: deals = [] } = useQuery({
    queryKey: ['deals-for-activity', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('deals')
        .select('id, title, company')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!formData.type) {
      toast({
        title: "Error",
        description: "Please select an activity type",
        variant: "destructive",
      });
      return;
    }

    if (!formData.subject.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }

    if (!formData.contact_id) {
      toast({
        title: "Error",
        description: "Please select a contact",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          type: formData.type,
          subject: formData.subject,
          description: formData.description || null,
          priority: formData.priority,
          status: formData.status,
          due_date: formData.due_date || null,
          contact_id: formData.contact_id,
          deal_id: formData.deal_id || null
        });

      if (error) throw error;

      toast({
        title: "Activity created!",
        description: "Your activity has been successfully created.",
      });

      setFormData({
        type: 'call',
        subject: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
        contact_id: '',
        deal_id: ''
      });
      
      onActivityCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error creating activity",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Activity</DialogTitle>
          <DialogDescription>
            Add a new activity, task, or interaction to track
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Activity subject"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Activity details"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact *</Label>
              <Select 
                value={formData.contact_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, contact_id: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
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
              <Label htmlFor="deal">Deal {initialDealId ? '*' : '(Optional)'}</Label>
              <Select 
                value={formData.deal_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, deal_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deal" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title} {deal.company && `(${deal.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Activity'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityForm;
