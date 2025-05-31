
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
    contact_name: '',
    next_step: '',
    probability: '50'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('deals')
        .insert({
          user_id: user.id,
          title: formData.title,
          company: formData.company,
          value: parseFloat(formData.value) || 0,
          stage: formData.stage,
          contact_name: formData.contact_name,
          next_step: formData.next_step,
          probability: parseInt(formData.probability) || 50
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
        contact_name: '',
        next_step: '',
        probability: '50'
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
            
            <div className="space-y-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => handleChange('probability', e.target.value)}
              />
            </div>
          </div>

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
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => handleChange('contact_name', e.target.value)}
              placeholder="John Doe"
            />
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
