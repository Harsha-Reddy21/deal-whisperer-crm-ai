import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Search, MessageSquare, Calendar, Mail, Plus, ArrowUpDown, Filter, SortAsc, SortDesc } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import ContactForm from './ContactForm';

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
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');

  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading contacts",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

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
            <Button onClick={() => setShowContactForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
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

      <ContactForm 
        open={showContactForm} 
        onOpenChange={setShowContactForm} 
        onContactCreated={refetch}
      />
    </div>
  );
};

export default ContactsList;
