import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, Plus, Search, Filter, ArrowUpDown, SortAsc, SortDesc, UserCheck, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import LeadForm from './LeadForm';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  score: number;
  status: string;
  created_at: string;
  assigned_to?: string;
}

type SortField = 'name' | 'company' | 'score' | 'status' | 'source' | 'created_at';
type SortDirection = 'asc' | 'desc';

const LeadManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');

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
        company: lead.company || '',
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || 'manual',
        score: lead.score || 0,
        status: lead.status || 'new',
        created_at: lead.created_at,
        assigned_to: lead.assigned_to
      }));
    },
    enabled: !!user,
  });

  // Advanced search and filter algorithm
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads;

    // Search algorithm - searches across multiple fields with weighted relevance
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = leads.filter(lead => {
        const nameMatch = lead.name.toLowerCase().includes(searchLower);
        const companyMatch = lead.company.toLowerCase().includes(searchLower);
        const emailMatch = lead.email.toLowerCase().includes(searchLower);
        const phoneMatch = lead.phone.toLowerCase().includes(searchLower);
        const sourceMatch = lead.source.toLowerCase().includes(searchLower);
        const statusMatch = lead.status.toLowerCase().includes(searchLower);
        
        return nameMatch || companyMatch || emailMatch || phoneMatch || sourceMatch || statusMatch;
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
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    // Score filter
    if (scoreFilter !== 'all') {
      switch (scoreFilter) {
        case 'high':
          filtered = filtered.filter(lead => lead.score >= 80);
          break;
        case 'medium':
          filtered = filtered.filter(lead => lead.score >= 50 && lead.score < 80);
          break;
        case 'low':
          filtered = filtered.filter(lead => lead.score < 50);
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
            // Custom status ordering
            const statusOrder = { 'new': 1, 'contacted': 2, 'qualified': 3, 'unqualified': 4, 'converted': 5 };
            aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
            bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
            break;
          case 'source':
            aValue = a.source;
            bValue = b.source;
            break;
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
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
  }, [leads, searchTerm, statusFilter, sourceFilter, scoreFilter, sortField, sortDirection]);

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
    setSourceFilter('all');
    setScoreFilter('all');
    setSortField('created_at');
    setSortDirection('desc');
  };

  // Calculate lead metrics
  const leadMetrics = useMemo(() => {
    const totalLeads = filteredAndSortedLeads.length;
    const qualifiedLeads = filteredAndSortedLeads.filter(lead => lead.status === 'qualified').length;
    const avgScore = totalLeads > 0 ? filteredAndSortedLeads.reduce((sum, lead) => sum + lead.score, 0) / totalLeads : 0;
    const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
    
    return { totalLeads, qualifiedLeads, avgScore, conversionRate };
  }, [filteredAndSortedLeads]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'unqualified': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'form': return '📝';
      case 'import': return '📊';
      case 'integration': return '🔗';
      case 'manual': return '✋';
      default: return '📋';
    }
  };

  const convertToContact = async (lead: Lead) => {
    try {
      // Create contact from lead
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          user_id: user?.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          status: 'Qualified',
          score: lead.score
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Update lead status to converted
      const { error: leadError } = await supabase
        .from('leads')
        .update({ 
          status: 'converted',
          converted_contact_id: contact.id
        })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      toast({
        title: "Lead converted!",
        description: `${lead.name} has been converted to a contact.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error converting lead",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="text-lg">Loading leads...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lead Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Leads</p>
                <p className="text-2xl font-bold text-slate-900">{leadMetrics.totalLeads}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Qualified</p>
                <p className="text-2xl font-bold text-slate-900">{leadMetrics.qualifiedLeads}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Score</p>
                <p className="text-2xl font-bold text-slate-900">{leadMetrics.avgScore.toFixed(0)}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-slate-900">{leadMetrics.conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Lead Management
              </CardTitle>
              <CardDescription>
                Track and convert your leads into customers
              </CardDescription>
            </div>
            <Button onClick={() => setShowLeadForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
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
                  placeholder="Search leads by name, company, email, phone..." 
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
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="form">Web Form</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
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

                {(searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' || scoreFilter !== 'all') && (
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
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-900">{lead.name}</h3>
                              <p className="text-sm text-slate-600">{lead.company}</p>
                            </div>
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
                            <span>{lead.email}</span>
                            <span>{lead.phone}</span>
                            <div className="flex items-center space-x-1">
                              <span>{getSourceIcon(lead.source)}</span>
                              <span className="capitalize">{lead.source}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">
                              Created: {new Date(lead.created_at).toLocaleDateString()}
                            </span>
                            <div className="flex space-x-2">
                              {lead.status !== 'converted' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => convertToContact(lead)}
                                  className="hover:bg-green-50"
                                >
                                  <Users className="w-4 h-4 mr-1" />
                                  Convert to Contact
                                </Button>
                              )}
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

      <LeadForm 
        open={showLeadForm} 
        onOpenChange={setShowLeadForm} 
        onLeadCreated={refetch}
      />
    </div>
  );
};

export default LeadManagement;
