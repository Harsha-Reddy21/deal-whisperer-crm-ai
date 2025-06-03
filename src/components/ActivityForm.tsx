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
import { User, Target, Plus } from 'lucide-react';
import { useLeadEmbeddings } from '@/hooks/useLeadEmbeddings';
import { useContactEmbeddings } from '@/hooks/useContactEmbeddings';

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivityCreated: () => void;
  initialDealId?: string; // Optional prop to pre-select a deal
  initialContactId?: string; // Optional prop to pre-select a contact
  initialLeadId?: string; // Optional prop to pre-select a lead
}

const ActivityForm = ({ open, onOpenChange, onActivityCreated, initialDealId, initialContactId, initialLeadId }: ActivityFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleActivityChanged: handleLeadActivityChanged } = useLeadEmbeddings();
  const { handleActivityChanged: handleContactActivityChanged } = useContactEmbeddings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'call',
    subject: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    contact_id: 'none',
    lead_id: 'none',
    deal_id: 'none'
  });
  const [entityType, setEntityType] = useState<'contact' | 'lead'>(
    initialContactId ? 'contact' : initialLeadId ? 'lead' : 'contact'
  );

  // Initialize form data with the pre-selected contact or lead
  useEffect(() => {
    if (initialContactId) {
      setFormData(prev => ({ ...prev, contact_id: initialContactId, lead_id: 'none' }));
      setEntityType('contact');
    } else if (initialLeadId) {
      setFormData(prev => ({ ...prev, lead_id: initialLeadId, contact_id: 'none' }));
      setEntityType('lead');
    }
    
    if (initialDealId) {
      setFormData(prev => ({ ...prev, deal_id: initialDealId }));
    }
  }, [initialContactId, initialLeadId, initialDealId]);

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
        contact_id: 'none',
        lead_id: 'none',
        deal_id: 'none'
      });
    }
  }, [open]);

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, company')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch leads
  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, company')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch deals for the dropdown
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
    enabled: !!user,
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

    if (entityType === 'contact' && (!formData.contact_id || formData.contact_id === 'none')) {
      toast({
        title: "Error",
        description: "Please select a contact",
        variant: "destructive",
      });
      return;
    }

    if (entityType === 'lead' && (!formData.lead_id || formData.lead_id === 'none') && !initialLeadId) {
      toast({
        title: "Error",
        description: "Please select a lead",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare activity data
      console.log('[ActivityForm] Creating new activity...');
      const activityData = {
        user_id: user.id,
        type: formData.type,
        subject: formData.subject.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: formData.status,
        due_date: formData.due_date || null,
        contact_id: formData.contact_id === 'none' ? null : formData.contact_id || null,
        lead_id: formData.lead_id === 'none' ? (initialLeadId || null) : formData.lead_id || null,
        deal_id: formData.deal_id === 'none' ? null : formData.deal_id || null
      };

      console.log('[ActivityForm] Activity data prepared:', { 
        type: activityData.type,
        lead_id: activityData.lead_id,
        contact_id: activityData.contact_id
      });

      const { data: newActivity, error } = await supabase
        .from('activities')
        .insert(activityData)
        .select('id, lead_id, contact_id')
        .single();

      if (error) throw error;

      // Handle embeddings updates for both leads and contacts if associated
      let embeddingsUpdated = false;

      // Update embeddings for the associated lead if exists
      if (newActivity?.id && newActivity?.lead_id) {
        console.log(`[ActivityForm] Activity created with ID: ${newActivity.id} for lead: ${newActivity.lead_id}, updating lead embeddings...`);
        try {
          await handleLeadActivityChanged(newActivity.id);
          console.log(`[ActivityForm] Lead embeddings update triggered for activity ${newActivity.id}`);
          embeddingsUpdated = true;
        } catch (embeddingError) {
          console.error('[ActivityForm] Error updating lead embeddings after activity creation:', embeddingError);
          // Don't fail the overall operation if embedding update fails
        }
      }

      // Update embeddings for the associated contact if exists
      if (newActivity?.id && newActivity?.contact_id) {
        console.log(`[ActivityForm] Activity created with ID: ${newActivity.id} for contact: ${newActivity.contact_id}, updating contact embeddings...`);
        try {
          await handleContactActivityChanged(newActivity.id);
          console.log(`[ActivityForm] Contact embeddings update triggered for activity ${newActivity.id}`);
          embeddingsUpdated = true;
        } catch (embeddingError) {
          console.error('[ActivityForm] Error updating contact embeddings after activity creation:', embeddingError);
          // Don't fail the overall operation if embedding update fails
        }
      }
      
      if (!embeddingsUpdated) {
        console.log('[ActivityForm] Activity created but no related lead or contact found, skipping embeddings update');
      }

      toast({
        title: "Activity created",
        description: "Your activity has been created successfully.",
      });

      console.log('[ActivityForm] Activity creation process completed successfully');
      
      // Reset form
      setFormData({
        type: 'call',
        subject: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
        contact_id: 'none',
        lead_id: 'none',
        deal_id: 'none'
      });
      onOpenChange(false);
      onActivityCreated();
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
          <DialogTitle>Add New Activity</DialogTitle>
          <DialogDescription>
            Track calls, meetings, and follow-ups with your contacts or leads.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Activity Type *</label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="task">Task</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subject *</label>
            <Input 
              placeholder="Activity subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea 
              placeholder="Activity details"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {!initialLeadId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Associated with</label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  type="button"
                  variant={entityType === 'contact' ? 'default' : 'outline'}
                  onClick={() => {
                    setEntityType('contact');
                    setFormData(prev => ({...prev, lead_id: 'none', contact_id: prev.contact_id}));
                  }}
                  className="w-full"
                >
                  Contact
                </Button>
                <Button 
                  type="button"
                  variant={entityType === 'lead' ? 'default' : 'outline'}
                  onClick={() => {
                    setEntityType('lead');
                    setFormData(prev => ({...prev, contact_id: 'none', lead_id: prev.lead_id}));
                  }}
                  className="w-full"
                >
                  Lead
                </Button>
              </div>
            </div>
          )}

          {entityType === 'contact' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact</label>
              <Select 
                value={formData.contact_id} 
                onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Lead</label>
              {initialLeadId ? (
                <div className="border rounded p-2 bg-blue-50 text-blue-800">
                  {leads.find(lead => lead.id === initialLeadId)?.name || 'Selected Lead'}
                </div>
              ) : (
                <Select 
                  value={formData.lead_id} 
                  onValueChange={(value) => setFormData({ ...formData, lead_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Only show deal selection when a contact is selected */}
          {entityType === 'contact' && formData.contact_id && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Related Deal (Optional)</label>
              <Select 
                value={formData.deal_id} 
                onValueChange={(value) => setFormData({ ...formData, deal_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a deal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input 
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end pt-4 space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Activity
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityForm;


