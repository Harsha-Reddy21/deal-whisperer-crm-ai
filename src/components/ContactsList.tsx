import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Search, MessageSquare, Calendar, Mail, Plus, ArrowUpDown, Filter, SortAsc, SortDesc, Edit, Trash2, Linkedin, Globe, Star, TrendingUp, Building2, MapPin, GraduationCap, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import ContactForm from './ContactForm';
import { searchLinkedInContacts, type LinkedInSearchResponse, type LinkedInContact } from '@/lib/ai';

interface Contact {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  status: string;
  score: number;
  last_contact: string;
  persona: string;
  avatar?: string;
  created_at: string;
}

type SortField = 'name' | 'company' | 'score' | 'status' | 'created_at' | 'last_contact';
type SortDirection = 'asc' | 'desc';

const ContactsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    status: 'Cold Lead'
  });

  // LinkedIn Search state
  const [showLinkedInDialog, setShowLinkedInDialog] = useState(false);
  const [linkedInResults, setLinkedInResults] = useState<LinkedInSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [addingContactId, setAddingContactId] = useState<string | null>(null);
  const [searchForm, setSearchForm] = useState({
    searchQuery: '',
    targetIndustries: [] as string[],
    targetRoles: [] as string[],
    companySize: 'any' as const,
    location: '',
    projectDescription: '',
    maxResults: 5
  });

  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      console.log('Fetching contacts for user:', user.id);
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading contacts:', error);
        toast({
          title: "Error loading contacts",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      console.log('Loaded contacts:', data?.length || 0);

      return data.map(contact => ({
        id: contact.id,
        name: contact.name,
        company: contact.company || '',
        title: contact.title || '',
        email: contact.email || '',
        phone: contact.phone || '',
        status: contact.status || 'Cold Lead',
        score: contact.score || 0,
        last_contact: contact.last_contact ? new Date(contact.last_contact).toLocaleDateString() : 'No contact',
        persona: contact.persona || 'Not analyzed',
        avatar: contact.avatar,
        created_at: contact.created_at
      }));
    },
    enabled: !!user,
    staleTime: 0, // Always refetch when requested
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Advanced search and filter algorithm
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = contacts;

    // Search algorithm - searches across multiple fields with weighted relevance
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = contacts.filter(contact => {
        const nameMatch = contact.name.toLowerCase().includes(searchLower);
        const companyMatch = contact.company.toLowerCase().includes(searchLower);
        const emailMatch = contact.email.toLowerCase().includes(searchLower);
        const titleMatch = contact.title.toLowerCase().includes(searchLower);
        const phoneMatch = contact.phone.toLowerCase().includes(searchLower);
        const personaMatch = contact.persona.toLowerCase().includes(searchLower);
        
        return nameMatch || companyMatch || emailMatch || titleMatch || phoneMatch || personaMatch;
      });

      // Sort by relevance when searching
      filtered.sort((a, b) => {
        const aName = a.name.toLowerCase().includes(searchLower) ? 3 : 0;
        const aCompany = a.company.toLowerCase().includes(searchLower) ? 2 : 0;
        const aEmail = a.email.toLowerCase().includes(searchLower) ? 1 : 0;
        const aRelevance = aName + aCompany + aEmail;

        const bName = b.name.toLowerCase().includes(searchLower) ? 3 : 0;
        const bCompany = b.company.toLowerCase().includes(searchLower) ? 2 : 0;
        const bEmail = b.email.toLowerCase().includes(searchLower) ? 1 : 0;
        const bRelevance = bName + bCompany + bEmail;

        return bRelevance - aRelevance;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => contact.status === statusFilter);
    }

    // Score filter
    if (scoreFilter !== 'all') {
      switch (scoreFilter) {
        case 'high':
          filtered = filtered.filter(contact => contact.score >= 80);
          break;
        case 'medium':
          filtered = filtered.filter(contact => contact.score >= 50 && contact.score < 80);
          break;
        case 'low':
          filtered = filtered.filter(contact => contact.score < 50);
          break;
      }
    }

    // Sorting algorithm
    if (!searchTerm.trim()) { // Only apply custom sorting when not searching
      filtered.sort((a, b) => {
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
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case 'last_contact':
            aValue = a.last_contact === 'No contact' ? new Date(0) : new Date(a.last_contact);
            bValue = b.last_contact === 'No contact' ? new Date(0) : new Date(b.last_contact);
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [contacts, searchTerm, statusFilter, scoreFilter, sortField, sortDirection]);

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
    setScoreFilter('all');
    setSortField('created_at');
    setSortDirection('desc');
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name,
      email: contact.email,
      company: contact.company,
      phone: contact.phone,
      status: contact.status
    });
  };

  const handleSaveEdit = async () => {
    if (!editingContact || !user) return;

    // Validation for mandatory fields
    if (!editForm.name.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter the contact's name.",
        variant: "destructive",
      });
      return;
    }

    if (!editForm.company.trim()) {
      toast({
        title: "Company is required",
        description: "Please enter the company name.",
        variant: "destructive",
      });
      return;
    }

    if (!editForm.email.trim()) {
      toast({
        title: "Email is required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!editForm.phone.trim()) {
      toast({
        title: "Phone is required",
        description: "Please enter a phone number.",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          company: editForm.company.trim(),
          phone: editForm.phone.trim(),
          status: editForm.status
        })
        .eq('id', editingContact.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Contact updated",
        description: "Contact has been successfully updated.",
      });

      setEditingContact(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error updating contact",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingContact || !user) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', deletingContact.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Contact deleted",
        description: "Contact has been successfully deleted.",
      });

      setDeletingContact(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error deleting contact",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createSampleContact = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        name: 'John Smith',
        company: 'Tech Innovations Inc.',
        title: 'CTO',
        email: 'john.smith@techinnovations.com',
        phone: '+1 (555) 123-4567',
        status: 'Qualified',
        score: 75,
        persona: 'Technical Decision Maker'
      });

    if (error) {
      toast({
        title: "Error creating contact",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Contact created!",
        description: "New sample contact has been added.",
      });
      refetch();
    }
  };

  const handleLinkedInSearch = async () => {
    if (!searchForm.searchQuery.trim()) {
      toast({
        title: "Search query required",
        description: "Please enter a search query to find LinkedIn contacts.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setShowLinkedInDialog(true);

    try {
      const results = await searchLinkedInContacts({
        searchQuery: searchForm.searchQuery,
        targetIndustries: searchForm.targetIndustries.length > 0 ? searchForm.targetIndustries : undefined,
        targetRoles: searchForm.targetRoles.length > 0 ? searchForm.targetRoles : undefined,
        companySize: searchForm.companySize !== 'any' ? searchForm.companySize : undefined,
        location: searchForm.location || undefined,
        projectDescription: searchForm.projectDescription || undefined,
        idealCustomerProfile: "CRM and sales technology users, decision makers in technology adoption",
        maxResults: searchForm.maxResults
      });

      setLinkedInResults(results);
      
      toast({
        title: "LinkedIn Search Complete!",
        description: `Found ${results.contacts.length} relevant contacts with average relevance score of ${results.searchMetadata.averageRelevanceScore}%.`,
      });

    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Failed to search LinkedIn contacts. Please try again.",
        variant: "destructive",
      });
      setShowLinkedInDialog(false);
    } finally {
      setIsSearching(false);
    }
  };

  const addLinkedInContact = async (linkedInContact: LinkedInContact) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add contacts.",
        variant: "destructive",
      });
      return;
    }

    // Set loading state for this specific contact
    setAddingContactId(linkedInContact.id);

    console.log('Adding LinkedIn contact:', linkedInContact);
    console.log('User ID:', user.id);

    try {
      const contactData = {
        user_id: user.id,
        name: linkedInContact.name,
        company: linkedInContact.company,
        title: linkedInContact.title,
        email: linkedInContact.email || '',
        phone: linkedInContact.phone || '',
        status: linkedInContact.contactPotential === 'high' ? 'Hot Lead' : 
                linkedInContact.contactPotential === 'medium' ? 'Qualified' : 'Cold Lead',
        score: linkedInContact.relevanceScore,
        persona: `LinkedIn: ${linkedInContact.profileSummary.substring(0, 100)}...`
      };

      console.log('Contact data to insert:', contactData);

      const { data, error } = await supabase
        .from('contacts')
        .insert(contactData)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Contact inserted successfully:', data);

      // Refetch contacts to update the list
      console.log('Refetching contacts...');
      const refetchResult = await refetch();
      console.log('Refetch result:', refetchResult);
      
      // Verify the contact was added
      setTimeout(() => {
        const addedContact = contacts.find(c => c.name === linkedInContact.name && c.company === linkedInContact.company);
        if (addedContact) {
          console.log('Contact successfully found in list:', addedContact);
          toast({
            title: "✅ Verified!",
            description: `${linkedInContact.name} is now visible in your contacts list.`,
            variant: "default",
          });
        } else {
          console.log('Contact not found in list yet, current contacts:', contacts.length);
          toast({
            title: "Contact added to database",
            description: `${linkedInContact.name} was saved. Refresh the page if not visible.`,
            variant: "default",
          });
        }
      }, 1000);
      
      // Show success feedback
      toast({
        title: "Success!",
        description: `${linkedInContact.name} has been added to your contacts.`,
        variant: "default",
      });

    } catch (error: any) {
      console.error('Error adding LinkedIn contact:', error);
      toast({
        title: "Error adding contact",
        description: error.message || "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clear loading state
      setAddingContactId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot Lead': return 'bg-red-100 text-red-800';
      case 'Qualified': return 'bg-yellow-100 text-yellow-800';
      case 'Customer': return 'bg-green-100 text-green-800';
      case 'Cold Lead': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-lg">Loading contacts...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Contact Management
              </CardTitle>
              <CardDescription>
                Manage your contacts with AI-generated personas
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setShowLinkedInDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
              >
                <Linkedin className="w-4 h-4 mr-2" />
                Get from LinkedIn
              </Button>
              <Button 
                onClick={() => refetch()}
                variant="outline"
                size="sm"
              >
                🔄 Refresh
              </Button>
              <Button onClick={() => setShowContactForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search contacts by name, company, email, title..." 
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
                    <SelectItem value="Hot Lead">Hot Lead</SelectItem>
                    <SelectItem value="Qualified">Qualified</SelectItem>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Cold Lead">Cold Lead</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Score" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="high">High (80+)</SelectItem>
                    <SelectItem value="medium">Medium (50-79)</SelectItem>
                    <SelectItem value="low">Low (&lt;50)</SelectItem>
                  </SelectContent>
                </Select>

                {(searchTerm || statusFilter !== 'all' || scoreFilter !== 'all') && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
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
                { field: 'created_at', label: 'Date Added' },
                { field: 'last_contact', label: 'Last Contact' }
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
              Showing {filteredAndSortedContacts.length} of {contacts.length} contacts
              {searchTerm && ` matching "${searchTerm}"`}
            </div>

            {filteredAndSortedContacts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  {contacts.length === 0 ? "No contacts found. Create your first contact to get started!" : "No contacts match your search criteria."}
                </p>
                {contacts.length === 0 ? (
                  <Button onClick={() => setShowContactForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Contact
                  </Button>
                ) : (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredAndSortedContacts.map((contact) => (
                  <Card key={contact.id} className="border border-slate-200 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                              <p className="text-sm text-slate-600">{contact.title} at {contact.company}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(contact.status)}>
                                {contact.status}
                              </Badge>
                              <span className={`text-sm font-medium ${getScoreColor(contact.score)}`}>
                                {contact.score}/100
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {contact.email}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Last contact: {contact.last_contact}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                AI Persona: {contact.persona}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="outline">
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Message
                              </Button>
                              <Button size="sm" variant="outline" className="hover:bg-purple-50">
                                View Persona
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleEdit(contact)}
                                className="hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setDeletingContact(contact)}
                                className="hover:bg-red-50 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
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

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information. Name, company, email, and phone are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Contact name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Email address"
                type="email"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company *</label>
              <Input
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                placeholder="Company name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone *</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Phone number"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
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
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingContact(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingContact} onOpenChange={() => setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingContact?.name}"? This action cannot be undone.
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

      <ContactForm 
        open={showContactForm} 
        onOpenChange={setShowContactForm} 
        onContactCreated={refetch}
      />

      {/* LinkedIn Search Dialog */}
      <Dialog open={showLinkedInDialog} onOpenChange={setShowLinkedInDialog}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Linkedin className="w-5 h-5 mr-2 text-blue-600" />
              Get Contacts from LinkedIn
            </DialogTitle>
            <DialogDescription>
              Find and add relevant LinkedIn contacts that align with your project and ideal customer profile.
            </DialogDescription>
          </DialogHeader>
          
          {!linkedInResults ? (
            <div className="space-y-6">
              {/* Search Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Query *</label>
                  <Input
                    value={searchForm.searchQuery}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, searchQuery: e.target.value }))}
                    placeholder="e.g., CTO technology companies, VP Sales SaaS, Marketing Director"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Industries (Optional)</label>
                    <Input
                      value={searchForm.targetIndustries.join(', ')}
                      onChange={(e) => setSearchForm(prev => ({ 
                        ...prev, 
                        targetIndustries: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                      placeholder="Technology, SaaS, Healthcare, Finance"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Roles (Optional)</label>
                    <Input
                      value={searchForm.targetRoles.join(', ')}
                      onChange={(e) => setSearchForm(prev => ({ 
                        ...prev, 
                        targetRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                      placeholder="CTO, VP Sales, Director, Manager"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company Size</label>
                    <Select 
                      value={searchForm.companySize} 
                      onValueChange={(value: any) => setSearchForm(prev => ({ ...prev, companySize: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Size</SelectItem>
                        <SelectItem value="startup">Startup (1-50)</SelectItem>
                        <SelectItem value="small">Small (51-200)</SelectItem>
                        <SelectItem value="medium">Medium (201-1000)</SelectItem>
                        <SelectItem value="large">Large (1001-5000)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (5000+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location (Optional)</label>
                    <Input
                      value={searchForm.location}
                      onChange={(e) => setSearchForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="San Francisco, New York, Global"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Results</label>
                    <Select 
                      value={searchForm.maxResults.toString()} 
                      onValueChange={(value) => setSearchForm(prev => ({ ...prev, maxResults: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 contacts</SelectItem>
                        <SelectItem value="5">5 contacts</SelectItem>
                        <SelectItem value="10">10 contacts</SelectItem>
                        <SelectItem value="15">15 contacts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Description (Optional)</label>
                  <Input
                    value={searchForm.projectDescription}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, projectDescription: e.target.value }))}
                    placeholder="Describe your project or solution to find better aligned contacts"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => setShowLinkedInDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleLinkedInSearch}
                  disabled={isSearching || !searchForm.searchQuery.trim()}
                  className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
                >
                  {isSearching ? (
                    <>
                      <Globe className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search LinkedIn
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{linkedInResults.searchMetadata.totalFound}</div>
                  <div className="text-sm text-slate-600">Contacts Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{linkedInResults.searchMetadata.averageRelevanceScore}%</div>
                  <div className="text-sm text-slate-600">Avg Relevance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{linkedInResults.contacts.filter(c => c.contactPotential === 'high').length}</div>
                  <div className="text-sm text-slate-600">High Potential</div>
                </div>
              </div>

              {/* Contact Results */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  LinkedIn Contacts Found
                </h3>
                
                {linkedInResults.contacts.map((contact, index) => {
                  const potentialColors = {
                    high: 'bg-green-100 text-green-800 border-green-200',
                    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    low: 'bg-gray-100 text-gray-800 border-gray-200'
                  };
                  
                  return (
                    <Card key={contact.id} className="border border-slate-200">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Contact Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <Avatar className="w-12 h-12">
                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                  {contact.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900">{contact.name}</h4>
                                <p className="text-sm text-slate-600 flex items-center">
                                  <Briefcase className="w-3 h-3 mr-1" />
                                  {contact.title} at {contact.company}
                                </p>
                                <p className="text-sm text-slate-500 flex items-center mt-1">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {contact.location}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={potentialColors[contact.contactPotential]}>
                                {contact.contactPotential.toUpperCase()} POTENTIAL
                              </Badge>
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-600">{contact.relevanceScore}%</div>
                                <div className="text-xs text-slate-500">Relevance</div>
                              </div>
                            </div>
                          </div>

                          {/* Profile Summary */}
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-900">{contact.profileSummary}</p>
                          </div>

                          {/* Alignment Reason */}
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <h5 className="font-medium text-green-900 mb-1">Why This Contact Aligns:</h5>
                            <p className="text-sm text-green-800">{contact.alignmentReason}</p>
                          </div>

                          {/* Skills and Experience */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-slate-900 mb-2 flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                Key Skills
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {contact.skills.slice(0, 5).map((skill, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h5 className="font-medium text-slate-900 mb-2 flex items-center">
                                <GraduationCap className="w-4 h-4 mr-1" />
                                Education
                              </h5>
                              <div className="space-y-1">
                                {contact.education.slice(0, 2).map((edu, idx) => (
                                  <p key={idx} className="text-sm text-slate-600">{edu}</p>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Contact Info and Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              {contact.email && (
                                <div className="flex items-center">
                                  <Mail className="w-4 h-4 mr-1" />
                                  {contact.email}
                                </div>
                              )}
                              <div className="flex items-center">
                                <Building2 className="w-4 h-4 mr-1" />
                                Decision Power: {contact.estimatedDecisionMakingPower}%
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(contact.linkedinUrl, '_blank')}
                              >
                                <Linkedin className="w-4 h-4 mr-1" />
                                View Profile
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => addLinkedInContact(contact)}
                                disabled={addingContactId === contact.id}
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              >
                                {addingContactId === contact.id ? (
                                  <>
                                    <Globe className="w-4 h-4 mr-1 animate-spin" />
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Contact
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Insights */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">AI Insights</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Recommended Approach</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {linkedInResults.insights.recommendedApproach.slice(0, 3).map((approach, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-start">
                            <TrendingUp className="w-3 h-3 mt-1 mr-2 text-blue-600 flex-shrink-0" />
                            {approach}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Next Steps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {linkedInResults.insights.nextSteps.slice(0, 3).map((step, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-start">
                            <Star className="w-3 h-3 mt-1 mr-2 text-green-600 flex-shrink-0" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => setLinkedInResults(null)}>
                  New Search
                </Button>
                <Button variant="outline" onClick={() => setShowLinkedInDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactsList;
