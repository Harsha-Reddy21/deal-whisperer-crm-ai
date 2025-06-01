import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyCreated: () => void;
  editingCompany?: any;
}

const CompanyForm = ({ open, onOpenChange, onCompanyCreated, editingCompany }: CompanyFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: editingCompany?.name || '',
    website: editingCompany?.website || '',
    industry: editingCompany?.industry || '',
    size: editingCompany?.size || '',
    phone: editingCompany?.phone || '',
    email: editingCompany?.email || '',
    address: editingCompany?.address || '',
    city: editingCompany?.city || '',
    state: editingCompany?.state || '',
    country: editingCompany?.country || '',
    postal_code: editingCompany?.postal_code || '',
    description: editingCompany?.description || '',
    status: editingCompany?.status || 'prospect',
    revenue: editingCompany?.revenue || '',
    employees: editingCompany?.employees || '',
    founded_year: editingCompany?.founded_year || '',
    linkedin_url: editingCompany?.linkedin_url || '',
    twitter_url: editingCompany?.twitter_url || '',
    facebook_url: editingCompany?.facebook_url || '',
    notes: editingCompany?.notes || '',
    score: editingCompany?.score || 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const companyData = {
        ...formData,
        revenue: formData.revenue ? parseInt(formData.revenue) : null,
        employees: formData.employees ? parseInt(formData.employees) : null,
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
        user_id: user.id
      };

      let result;
      if (editingCompany) {
        result = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', editingCompany.id)
          .eq('user_id', user.id);
      } else {
        result = await supabase
          .from('companies')
          .insert([companyData]);
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: editingCompany ? "Company updated" : "Company created",
        description: editingCompany ? "Company has been updated successfully." : "New company has been added to your CRM.",
      });

      onCompanyCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        website: '',
        industry: '',
        size: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
        description: '',
        status: 'prospect',
        revenue: '',
        employees: '',
        founded_year: '',
        linkedin_url: '',
        twitter_url: '',
        facebook_url: '',
        notes: '',
        score: 0
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save company",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
          <DialogDescription>
            {editingCompany ? 'Update company information' : 'Enter the company details below'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Company name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={formData.industry} onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Company Size</Label>
                <Select value={formData.size} onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Startup (1-10)</SelectItem>
                    <SelectItem value="small">Small (11-50)</SelectItem>
                    <SelectItem value="medium">Medium (51-200)</SelectItem>
                    <SelectItem value="large">Large (201-1000)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="score">Score (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@company.com"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Address</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="Postal code"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Company Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Company Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revenue">Annual Revenue</Label>
                <Input
                  id="revenue"
                  type="number"
                  value={formData.revenue}
                  onChange={(e) => setFormData(prev => ({ ...prev, revenue: e.target.value }))}
                  placeholder="Annual revenue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employees">Number of Employees</Label>
                <Input
                  id="employees"
                  type="number"
                  value={formData.employees}
                  onChange={(e) => setFormData(prev => ({ ...prev, employees: e.target.value }))}
                  placeholder="Number of employees"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="founded_year">Founded Year</Label>
                <Input
                  id="founded_year"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.founded_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, founded_year: e.target.value }))}
                  placeholder="Founded year"
                />
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Social Media</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_url">Twitter URL</Label>
                <Input
                  id="twitter_url"
                  type="url"
                  value={formData.twitter_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, twitter_url: e.target.value }))}
                  placeholder="https://twitter.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook_url">Facebook URL</Label>
                <Input
                  id="facebook_url"
                  type="url"
                  value={formData.facebook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, facebook_url: e.target.value }))}
                  placeholder="https://facebook.com/..."
                />
              </div>
            </div>
          </div>

          {/* Description and Notes */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Company description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal notes"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingCompany ? 'Update Company' : 'Create Company'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyForm; 