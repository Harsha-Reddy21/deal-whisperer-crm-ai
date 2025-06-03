import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, Target, Users, Search, Filter, ArrowUpDown, SortAsc, SortDesc, Plus, Mail, Phone, Calendar, MessageSquare, Edit, Trash2, User, Linkedin, RefreshCw, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import LeadForm from './LeadForm';
import LeadDetail from './LeadDetail';
import EmailComposer from './EmailComposer';
import { useLeadEmbeddings } from '@/hooks/useLeadEmbeddings';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string;
  source: string;
  score: number;
  created_at: string;
  title?: string;
  last_contact?: string;
  assigned_to?: string;
  company_id?: string;
  converted_contact_id?: string;
  updated_at?: string;
  user_id?: string;
}

type SortField = 'name' | 'company' | 'score' | 'status' | 'source' | 'created_at';
type SortDirection = 'asc' | 'desc';

const LeadsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  
  // Selected lead for detail view
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  
  // LinkedIn integration state
  const [showLinkedInDialog, setShowLinkedInDialog] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    status: 'new',
    source: 'manual'
  });

  // Add state for email composer
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [leadForEmail, setLeadForEmail] = useState<Lead | null>(null);

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['leads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading leads",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email || '',
        company: lead.company || '',
        phone: lead.phone || '',
        status: lead.status || 'new',
        source: lead.source || 'manual',
        score: lead.score || 0,
        created_at: lead.created_at,
        title: lead.title || '',
        last_contact: lead.last_contact || ''
      }));
    },
    enabled: !!user,
  });

  const { handleLeadUpdated } = useLeadEmbeddings();

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm({
      name: lead.name,
      email: lead.email,
      company: lead.company,
      phone: lead.phone,
      status: lead.status,
      source: lead.source
    });
  };

  const handleSaveEdit = async () => {
    if (!user || !editingLead) return;

    // Validation
    if (!editForm.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`[LeadsList] Updating lead ${editingLead.id}...`);
      const { error } = await supabase
        .from('leads')
        .update({
          name: editForm.name,
          email: editForm.email,
          company: editForm.company,
          phone: editForm.phone,
          status: editForm.status,
          source: editForm.source,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingLead.id);

      if (error) throw error;

      // Update the embeddings for the lead after updating its data
      console.log(`[LeadsList] Lead ${editingLead.id} updated, now updating embeddings...`);
      try {
        await handleLeadUpdated(editingLead.id);
        console.log(`[LeadsList] Embeddings update triggered for lead ${editingLead.id}`);
      } catch (embeddingError) {
        console.error('[LeadsList] Error updating lead embeddings after edit:', embeddingError);
        // Don't fail the operation if embedding update fails
      }

      toast({
        title: "Success",
        description: "Lead updated successfully",
      });

      console.log('[LeadsList] Lead update process completed successfully');
      setEditingLead(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!user || !deletingLead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', deletingLead.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });

      setDeletingLead(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortField('created_at');
    setSortDirection('desc');
  };
  
  // Function to handle viewing a lead
  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetail(true);
  };

  const handleGetFromLinkedIn = () => {
    setShowLinkedInDialog(true);
    // Implementation would connect to LinkedIn API
    toast({
      title: "LinkedIn Integration",
      description: "This would open a LinkedIn integration dialog to import leads.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'unqualified': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'website': return <Globe className="w-4 h-4 mr-1" />;
      case 'referral': return <UserPlus className="w-4 h-4 mr-1" />;
      case 'linkedin': return <Linkedin className="w-4 h-4 mr-1" />;
      default: return <Target className="w-4 h-4 mr-1" />;
    }
  };

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    return leads
      .filter(lead => {
        // Status filter
        if (statusFilter !== 'all' && lead.status !== statusFilter) {
          return false;
        }
        
        // Search term filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          return (
            lead.name.toLowerCase().includes(searchLower) ||
            lead.company.toLowerCase().includes(searchLower) ||
            lead.email.toLowerCase().includes(searchLower)
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortField) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'company':
            aValue = a.company.toLowerCase();
            bValue = b.company.toLowerCase();
            break;
          case 'score':
            aValue = a.score;
            bValue = b.score;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'source':
            aValue = a.source;
            bValue = b.source;
            break;
          case 'created_at':
          default:
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [leads, searchTerm, statusFilter, sortField, sortDirection]);

  // Calculate metrics
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(lead => lead.status === 'qualified').length;
  const newLeads = leads.filter(lead => lead.status === 'new').length;

  // Add function to handle sending an email to a lead
  const handleSendEmail = (lead: Lead) => {
    setLeadForEmail(lead);
    setShowEmailComposer(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lead Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalLeads}</div>
            <p className="text-xs text-slate-600">Active prospects</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Qualified</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{qualifiedLeads}</div>
            <p className="text-xs text-slate-600">Ready for conversion</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">New Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{newLeads}</div>
            <p className="text-xs text-slate-600">Uncontacted leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads List */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-600" />
            Leads Management
          </CardTitle>
          <CardDescription>
            Manage and track all your leads in one place
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search leads by name, company, email..." 
                  className="flex-1" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-3">
                <Button 
                  onClick={handleGetFromLinkedIn}
                  className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
                >
                  <Linkedin className="w-4 h-4 mr-2" />
                  Get from LinkedIn
                </Button>
                <Button 
                  onClick={() => refetch()}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={() => setShowLeadForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lead
                </Button>
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-2 text-sm">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Sort by:</span>
              {[
                { field: 'name', label: 'Name' },
                { field: 'company', label: 'Company' },
                { field: 'score', label: 'Score' },
                { field: 'status', label: 'Status' },
                { field: 'source', label: 'Source' },
                { field: 'created_at', label: 'Date Added' }
              ].map(({ field, label }) => (
                <Button
                  key={field}
                  variant={sortField === field ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleSort(field as SortField)}
                  className="h-8"
                >
                  {label}
                  {sortField === field && (
                    sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>

            {/* Results Summary */}
            <div className="text-sm text-slate-600">
              Showing {filteredAndSortedLeads.length} of {leads.length} leads
              {searchTerm && ` matching "${searchTerm}"`}
            </div>

            {/* Lead List Display */}
            {filteredAndSortedLeads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  {leads.length === 0 ? "No leads found. Create your first lead to get started!" : "No leads match your search criteria."}
                </p>
                {leads.length === 0 ? (
                  <Button onClick={() => setShowLeadForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Lead
                  </Button>
                ) : (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredAndSortedLeads.map((lead) => (
                  <Card key={lead.id} className="border border-slate-200 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                              {lead.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-slate-900">{lead.name}</h3>
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(lead.status)}>
                                  {lead.status}
                                </Badge>
                                <span className={`text-sm font-medium ${getScoreColor(lead.score)}`}>
                                  {lead.score}/100
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <div className="flex items-center">
                                <span className="mr-1">{getSourceIcon(lead.source)}</span>
                                {lead.company || 'No company'}
                              </div>
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                {lead.email || 'No email'}
                              </div>
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-1" />
                                {lead.phone || 'No phone'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewLead(lead)}
                          >
                            <User className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEdit(lead)}
                            className="hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setDeletingLead(lead)}
                            className="hover:bg-red-50 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendEmail(lead)}
                            className="hover:bg-blue-50"
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Email
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Lead Dialog */}
      <Dialog open={showLeadForm || !!editingLead} onOpenChange={(open) => {
        if (!open) {
          setShowLeadForm(false);
          setEditingLead(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
            <DialogDescription>
              {editingLead ? "Update lead information" : "Add a new lead to your pipeline"}
            </DialogDescription>
          </DialogHeader>
          {editingLead ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Lead name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Email address"
                  type="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Source</label>
                <Select value={editForm.source} onValueChange={(value) => setEditForm({ ...editForm, source: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingLead(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <LeadForm 
              open={showLeadForm}
              onOpenChange={(open) => setShowLeadForm(open)}
              onLeadCreated={refetch}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingLead} onOpenChange={() => setDeletingLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLead?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Lead Detail Dialog */}
      <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLead && (
            <LeadDetail 
              leadId={selectedLead.id} 
              onClose={() => setShowLeadDetail(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Email Composer Dialog */}
      <Dialog open={showEmailComposer} onOpenChange={setShowEmailComposer}>
        <DialogContent className="max-w-4xl">
          {leadForEmail && (
            <EmailComposer 
              open={showEmailComposer}
              onOpenChange={setShowEmailComposer}
              prefilledTo={leadForEmail.email}
              prefilledSubject={`Regarding our business opportunity - ${leadForEmail.company}`}
              leadId={leadForEmail.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsList; 