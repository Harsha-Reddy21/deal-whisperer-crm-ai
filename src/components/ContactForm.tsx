import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useContactEmbeddings } from '@/hooks/useContactEmbeddings';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactCreated: () => void;
}

const ContactForm = ({ open, onOpenChange, onContactCreated }: ContactFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleContactCreated } = useContactEmbeddings();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    title: '',
    email: '',
    phone: '',
    status: 'Cold Lead',
    persona: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation for mandatory fields
    if (!formData.name.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter the contact's name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.company.trim()) {
      toast({
        title: "Company is required",
        description: "Please enter the company name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Email is required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.phone.trim()) {
      toast({
        title: "Phone is required",
        description: "Please enter a phone number.",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('[ContactForm] Creating new contact...');
      // Create the contact
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          company: formData.company.trim(),
          title: formData.title.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          status: formData.status,
          persona: formData.persona.trim(),
          score: Math.floor(Math.random() * 100) // Random score for demo
        })
        .select('id')
        .single();

      if (error) throw error;

      // Generate embedding for the new contact
      if (newContact?.id) {
        console.log(`[ContactForm] Contact created with ID: ${newContact.id}, now generating embeddings...`);
        try {
          await handleContactCreated(newContact.id);
          console.log(`[ContactForm] Embeddings generation triggered for contact ${newContact.id}`);
        } catch (embeddingError) {
          console.error('[ContactForm] Error generating contact embedding:', embeddingError);
          // Don't fail the operation if embedding generation fails
        }
      }

      toast({
        title: "Contact created!",
        description: "Your new contact has been added.",
      });

      console.log('[ContactForm] Contact creation process completed successfully');

      // Reset form
      setFormData({
        name: '',
        company: '',
        title: '',
        email: '',
        phone: '',
        status: 'Cold Lead',
        persona: ''
      });

      onContactCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error creating contact",
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
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Add a new contact to your CRM.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="Acme Corp"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="CTO"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cold Lead">Cold Lead</SelectItem>
                <SelectItem value="Hot Lead">Hot Lead</SelectItem>
                <SelectItem value="Qualified">Qualified</SelectItem>
                <SelectItem value="Customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona">AI Persona</Label>
            <Input
              id="persona"
              value={formData.persona}
              onChange={(e) => handleChange('persona', e.target.value)}
              placeholder="Technical Decision Maker"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactForm;
