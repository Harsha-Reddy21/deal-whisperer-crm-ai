import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Building2, Search, Filter, ArrowUpDown, SortAsc, SortDesc, Plus, Mail, Phone, Globe, Edit, Trash2, MapPin, Users, DollarSign, Calendar, ExternalLink, Brain, Sparkles, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CompanyForm from './CompanyForm';
import { 
  researchCompanyInfo, 
  generateCompanies, 
  isOpenAIConfigured,
  isTavilyConfigured,
  type CompanyInfo,
  type CompanyResearchRequest,
  type CompanyGenerationRequest,
  type CompanyResearchResponse,
  type CompanyGenerationResponse
} from '@/lib/ai';

interface Company {
  id: string;
  name: string;
  website: string;
  industry: string;
  size: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  description: string;
  status: string;
  revenue: number;
  employees: number;
  founded_year: number;
  linkedin_url: string;
  twitter_url: string;
  facebook_url: string;
  notes: string;
  score: number;
  last_contact: string;
  next_follow_up: string;
  created_at: string;
}

type SortField = 'name' | 'industry' | 'size' | 'status' | 'score' | 'revenue' | 'employees' | 'created_at';
type SortDirection = 'asc' | 'desc';

const CompaniesManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');

  // AI Features State
  const [showCompanyResearchDialog, setShowCompanyResearchDialog] = useState(false);
  const [showCompanyGenerationDialog, setShowCompanyGenerationDialog] = useState(false);
  const [researchCompanyName, setResearchCompanyName] = useState('');
  const [researchContext, setResearchContext] = useState('');
  const [generationQuery, setGenerationQuery] = useState('');
  const [generationCount, setGenerationCount] = useState(10);
  const [researchResult, setResearchResult] = useState<CompanyResearchResponse | null>(null);
  const [generationResult, setGenerationResult] = useState<CompanyGenerationResponse | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ['companies', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading companies",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data.map(company => ({
        id: company.id,
        name: company.name,
        website: company.website || '',
        industry: company.industry || '',
        size: company.size || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        country: company.country || '',
        postal_code: company.postal_code || '',
        description: company.description || '',
        status: company.status || 'prospect',
        revenue: company.revenue || 0,
        employees: company.employees || 0,
        founded_year: company.founded_year || 0,
        linkedin_url: company.linkedin_url || '',
        twitter_url: company.twitter_url || '',
        facebook_url: company.facebook_url || '',
        notes: company.notes || '',
        score: company.score || 0,
        last_contact: company.last_contact || '',
        next_follow_up: company.next_follow_up || '',
        created_at: company.created_at
      }));
    },
    enabled: !!user,
  });

  // Mutation to add a company from AI research
  const addCompanyMutation = useMutation({
    mutationFn: async (companyInfo: CompanyInfo) => {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          user_id: user?.id,
          name: companyInfo.name,
          website: companyInfo.website,
          industry: companyInfo.industry,
          size: companyInfo.size,
          phone: companyInfo.phone,
          email: companyInfo.email,
          address: companyInfo.headquarters,
          city: companyInfo.city,
          state: companyInfo.state,
          country: companyInfo.country,
          description: companyInfo.description,
          status: companyInfo.status,
          revenue: companyInfo.revenue,
          employees: companyInfo.employees,
          founded_year: companyInfo.founded_year,
          linkedin_url: companyInfo.linkedin_url,
          twitter_url: companyInfo.twitter_url,
          score: companyInfo.score
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      refetch();
      toast({
        title: "Company added",
        description: "Company has been successfully added to your database.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding company",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Research company information
  const handleResearchCompany = async () => {
    if (!researchCompanyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter a company name to research.",
        variant: "destructive",
      });
      return;
    }

    if (!isOpenAIConfigured()) {
      toast({
        title: "AI not configured",
        description: "OpenAI API key not configured. Please check your settings.",
        variant: "destructive",
      });
      return;
    }

    setIsResearching(true);
    try {
      const request: CompanyResearchRequest = {
        companyName: researchCompanyName,
        additionalContext: researchContext
      };

      const result = await researchCompanyInfo(request);
      setResearchResult(result);

      if (result.success) {
        toast({
          title: "Research completed",
          description: `Found detailed information about ${result.companyInfo.name}`,
        });
      } else {
        toast({
          title: "Research completed with limited data",
          description: "Some information may be incomplete. Please review and edit as needed.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error researching company:', error);
      toast({
        title: "Research failed",
        description: error instanceof Error ? error.message : 'Failed to research company information',
        variant: "destructive",
      });
    } finally {
      setIsResearching(false);
    }
  };

  // Generate companies based on query
  const handleGenerateCompanies = async () => {
    if (!generationQuery.trim()) {
      toast({
        title: "Query required",
        description: "Please enter a search query to generate companies.",
        variant: "destructive",
      });
      return;
    }

    if (!isOpenAIConfigured()) {
      toast({
        title: "AI not configured",
        description: "OpenAI API key not configured. Please check your settings.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const request: CompanyGenerationRequest = {
        query: generationQuery,
        count: generationCount
      };

      const result = await generateCompanies(request);
      setGenerationResult(result);

      if (result.success) {
        toast({
          title: "Companies generated",
          description: `Found ${result.totalFound} companies matching your criteria`,
        });
      } else {
        toast({
          title: "Generation completed with sample data",
          description: "Using fallback data. Please review the results.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating companies:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : 'Failed to generate companies',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Add company from research result
  const handleAddResearchedCompany = () => {
    if (researchResult?.companyInfo) {
      addCompanyMutation.mutate(researchResult.companyInfo);
      setShowCompanyResearchDialog(false);
      setResearchResult(null);
      setResearchCompanyName('');
      setResearchContext('');
    }
  };

  // Add company from generation result
  const handleAddGeneratedCompany = (companyInfo: CompanyInfo) => {
    addCompanyMutation.mutate(companyInfo);
  };

  // Advanced search and filter algorithm
  const filteredAndSortedCompanies = useMemo(() => {
    let filtered = companies;

    // Search algorithm - searches across multiple fields with weighted relevance
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = companies.filter(company => {
        const nameMatch = company.name.toLowerCase().includes(searchLower);
        const industryMatch = company.industry.toLowerCase().includes(searchLower);
        const cityMatch = company.city.toLowerCase().includes(searchLower);
        const countryMatch = company.country.toLowerCase().includes(searchLower);
        const descriptionMatch = company.description.toLowerCase().includes(searchLower);
        const websiteMatch = company.website.toLowerCase().includes(searchLower);
        
        return nameMatch || industryMatch || cityMatch || countryMatch || descriptionMatch || websiteMatch;
      });

      // Sort by relevance when searching
      filtered.sort((a, b) => {
        const aName = a.name.toLowerCase().includes(searchLower) ? 3 : 0;
        const aIndustry = a.industry.toLowerCase().includes(searchLower) ? 2 : 0;
        const aCity = a.city.toLowerCase().includes(searchLower) ? 1 : 0;
        const aRelevance = aName + aIndustry + aCity;

        const bName = b.name.toLowerCase().includes(searchLower) ? 3 : 0;
        const bIndustry = b.industry.toLowerCase().includes(searchLower) ? 2 : 0;
        const bCity = b.city.toLowerCase().includes(searchLower) ? 1 : 0;
        const bRelevance = bName + bIndustry + bCity;

        return bRelevance - aRelevance;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(company => company.status === statusFilter);
    }

    // Industry filter
    if (industryFilter !== 'all') {
      filtered = filtered.filter(company => company.industry === industryFilter);
    }

    // Size filter
    if (sizeFilter !== 'all') {
      filtered = filtered.filter(company => company.size === sizeFilter);
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
          case 'industry':
            aValue = a.industry.toLowerCase();
            bValue = b.industry.toLowerCase();
            break;
          case 'size':
            const sizeOrder = { 'startup': 1, 'small': 2, 'medium': 3, 'large': 4, 'enterprise': 5 };
            aValue = sizeOrder[a.size as keyof typeof sizeOrder] || 0;
            bValue = sizeOrder[b.size as keyof typeof sizeOrder] || 0;
            break;
          case 'status':
            const statusOrder = { 'prospect': 1, 'customer': 2, 'partner': 3, 'inactive': 4 };
            aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
            bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
            break;
          case 'score':
            aValue = a.score;
            bValue = b.score;
            break;
          case 'revenue':
            aValue = a.revenue;
            bValue = b.revenue;
            break;
          case 'employees':
            aValue = a.employees;
            bValue = b.employees;
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
  }, [companies, searchTerm, statusFilter, industryFilter, sizeFilter, sortField, sortDirection]);

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
    setIndustryFilter('all');
    setSizeFilter('all');
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setShowCompanyForm(true);
  };

  const handleDelete = async () => {
    if (!deletingCompany || !user) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', deletingCompany.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Company deleted",
        description: "Company has been removed from your CRM.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error deleting company",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingCompany(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'customer': return 'bg-green-100 text-green-800';
      case 'prospect': return 'bg-blue-100 text-blue-800';
      case 'partner': return 'bg-purple-100 text-purple-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSizeColor = (size: string) => {
    switch (size) {
      case 'startup': return 'bg-yellow-100 text-yellow-800';
      case 'small': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-green-100 text-green-800';
      case 'large': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatRevenue = (revenue: number) => {
    if (revenue >= 1000000000) return `$${(revenue / 1000000000).toFixed(1)}B`;
    if (revenue >= 1000000) return `$${(revenue / 1000000).toFixed(1)}M`;
    if (revenue >= 1000) return `$${(revenue / 1000).toFixed(0)}K`;
    return `$${revenue}`;
  };

  const formatEmployees = (employees: number) => {
    if (employees >= 1000) return `${(employees / 1000).toFixed(1)}K`;
    return employees.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading companies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Companies</h2>
          <p className="text-slate-600">
            Manage your company database and relationships
            {isTavilyConfigured() && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                Tavily Search Active
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setShowCompanyResearchDialog(true)} 
            variant="outline"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            disabled={!isOpenAIConfigured()}
            title={!isOpenAIConfigured() ? "OpenAI API key required" : isTavilyConfigured() ? "AI research with real-time web search" : "AI research with simulated data"}
          >
            <Brain className="w-4 h-4 mr-2" />
            Get Company Info AI
            {isTavilyConfigured() && <span className="ml-1 text-xs">🌐</span>}
          </Button>
          <Button 
            onClick={() => setShowCompanyGenerationDialog(true)} 
            variant="outline"
            className="bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700"
            disabled={!isOpenAIConfigured()}
            title={!isOpenAIConfigured() ? "OpenAI API key required" : isTavilyConfigured() ? "AI generation with real-time web search" : "AI generation with simulated data"}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Companies
            {isTavilyConfigured() && <span className="ml-1 text-xs">🌐</span>}
          </Button>
          <Button onClick={() => setShowCompanyForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.filter(c => c.status === 'customer').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.filter(c => c.status === 'prospect').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRevenue(companies.reduce((sum, c) => sum + (c.revenue || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Filter Companies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search companies by name, industry, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
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

            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                <SelectItem value="startup">Startup (1-10)</SelectItem>
                <SelectItem value="small">Small (11-50)</SelectItem>
                <SelectItem value="medium">Medium (51-200)</SelectItem>
                <SelectItem value="large">Large (201-1000)</SelectItem>
                <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Companies List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Companies ({filteredAndSortedCompanies.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSort('name')}>
                Name
                {sortField === 'name' && (sortDirection === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSort('score')}>
                Score
                {sortField === 'score' && (sortDirection === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSort('revenue')}>
                Revenue
                {sortField === 'revenue' && (sortDirection === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedCompanies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || industryFilter !== 'all' || sizeFilter !== 'all'
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first company"}
              </p>
              {!searchTerm && statusFilter === 'all' && industryFilter === 'all' && sizeFilter === 'all' && (
                <Button onClick={() => setShowCompanyForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Company
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAndSortedCompanies.map((company) => (
                <Card key={company.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{company.name}</h3>
                          <Badge className={getStatusColor(company.status)}>
                            {company.status}
                          </Badge>
                          {company.size && (
                            <Badge variant="outline" className={getSizeColor(company.size)}>
                              {company.size}
                            </Badge>
                          )}
                          {company.score > 0 && (
                            <span className={`text-sm font-medium ${getScoreColor(company.score)}`}>
                              Score: {company.score}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-600">
                          {company.industry && (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {company.industry}
                            </div>
                          )}
                          {(company.city || company.country) && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {[company.city, company.country].filter(Boolean).join(', ')}
                            </div>
                          )}
                          {company.employees > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {formatEmployees(company.employees)} employees
                            </div>
                          )}
                          {company.revenue > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {formatRevenue(company.revenue)} revenue
                            </div>
                          )}
                        </div>

                        {company.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{company.description}</p>
                        )}

                        <div className="flex items-center gap-4 mt-3">
                          {company.website && (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <Globe className="w-4 h-4" />
                              Website
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {company.email && (
                            <a
                              href={`mailto:${company.email}`}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <Mail className="w-4 h-4" />
                              Email
                            </a>
                          )}
                          {company.phone && (
                            <a
                              href={`tel:${company.phone}`}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <Phone className="w-4 h-4" />
                              Call
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(company)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDeletingCompany(company)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Form Dialog */}
      <CompanyForm
        open={showCompanyForm}
        onOpenChange={(open) => {
          setShowCompanyForm(open);
          if (!open) setEditingCompany(null);
        }}
        onCompanyCreated={() => {
          refetch();
          setEditingCompany(null);
        }}
        editingCompany={editingCompany}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCompany} onOpenChange={() => setDeletingCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCompany?.name}"? This action cannot be undone.
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

      {/* Company Research Dialog */}
      <Dialog open={showCompanyResearchDialog} onOpenChange={setShowCompanyResearchDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              Get Company Info AI
            </DialogTitle>
            <DialogDescription>
              Research detailed information about any company using AI-powered {isTavilyConfigured() ? 'Tavily web search' : 'analysis'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name *</label>
              <Input
                placeholder="e.g., Apple Inc, Microsoft Corporation"
                value={researchCompanyName}
                onChange={(e) => setResearchCompanyName(e.target.value)}
                disabled={isResearching}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Context (Optional)</label>
              <Textarea
                placeholder="Any specific information you're looking for about this company..."
                value={researchContext}
                onChange={(e) => setResearchContext(e.target.value)}
                disabled={isResearching}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCompanyResearchDialog(false)}
                disabled={isResearching}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleResearchCompany}
                disabled={isResearching || !researchCompanyName.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {isResearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Researching...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Research Company
                  </>
                )}
              </Button>
            </div>

            {/* Research Results */}
            {researchResult && (
              <div className="mt-6 p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Research Results</h3>
                  <div className="flex items-center space-x-2">
                    {researchResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="text-sm text-slate-600">
                      Confidence: {researchResult.confidence}%
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Company:</span> {researchResult.companyInfo.name}
                    </div>
                    <div>
                      <span className="font-medium">Industry:</span> {researchResult.companyInfo.industry}
                    </div>
                    <div>
                      <span className="font-medium">Size:</span> {researchResult.companyInfo.size}
                    </div>
                    <div>
                      <span className="font-medium">Employees:</span> {researchResult.companyInfo.employees.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Revenue:</span> ${(researchResult.companyInfo.revenue / 1000000).toFixed(1)}M
                    </div>
                    <div>
                      <span className="font-medium">Founded:</span> {researchResult.companyInfo.founded_year}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-sm text-slate-600 mt-1">{researchResult.companyInfo.description}</p>
                  </div>

                  <div>
                    <span className="font-medium">Location:</span>
                    <p className="text-sm text-slate-600">{researchResult.companyInfo.city}, {researchResult.companyInfo.state}, {researchResult.companyInfo.country}</p>
                  </div>

                  {researchResult.sources.length > 0 && (
                    <div>
                      <span className="font-medium">Sources:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {researchResult.sources.map((source, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleAddResearchedCompany}
                      disabled={addCompanyMutation.isPending}
                      className="bg-gradient-to-r from-green-600 to-blue-600"
                    >
                      {addCompanyMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Database
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Generation Dialog */}
      <Dialog open={showCompanyGenerationDialog} onOpenChange={setShowCompanyGenerationDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-green-600" />
              Get Companies
            </DialogTitle>
            <DialogDescription>
              Generate a list of companies based on your search criteria using AI {isTavilyConfigured() ? 'with real-time Tavily web search' : 'analysis'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Query *</label>
              <Input
                placeholder="e.g., top 10 AI companies in Silicon Valley, fintech startups in New York"
                value={generationQuery}
                onChange={(e) => setGenerationQuery(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Companies</label>
              <Select value={generationCount.toString()} onValueChange={(value) => setGenerationCount(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 companies</SelectItem>
                  <SelectItem value="10">10 companies</SelectItem>
                  <SelectItem value="15">15 companies</SelectItem>
                  <SelectItem value="20">20 companies</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCompanyGenerationDialog(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateCompanies}
                disabled={isGenerating || !generationQuery.trim()}
                className="bg-gradient-to-r from-green-600 to-blue-600"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Companies
                  </>
                )}
              </Button>
            </div>

            {/* Generation Results */}
            {generationResult && (
              <div className="mt-6 p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Generated Companies ({generationResult.totalFound})</h3>
                  <div className="flex items-center space-x-2">
                    {generationResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="text-sm text-slate-600">
                      Query: "{generationResult.query}"
                    </span>
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {generationResult.companies.map((company, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold">{company.name}</h4>
                            <Badge className="bg-blue-100 text-blue-800">
                              {company.industry}
                            </Badge>
                            <Badge variant="outline">
                              {company.size}
                            </Badge>
                            <span className="text-sm font-medium text-green-600">
                              Score: {company.score}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {company.employees.toLocaleString()} employees
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${(company.revenue / 1000000).toFixed(1)}M revenue
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {company.city}, {company.country}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Founded {company.founded_year}
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 mb-3">{company.description}</p>

                          <div className="flex items-center gap-4">
                            {company.website && (
                              <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                <Globe className="w-4 h-4" />
                                Website
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {company.linkedin_url && (
                              <a
                                href={company.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                LinkedIn
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        <Button 
                          size="sm"
                          onClick={() => handleAddGeneratedCompany(company)}
                          disabled={addCompanyMutation.isPending}
                          className="ml-4 bg-gradient-to-r from-green-600 to-blue-600"
                        >
                          {addCompanyMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompaniesManager; 