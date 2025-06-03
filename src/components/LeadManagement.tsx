import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { UserPlus, TrendingUp, Target, Users, Search, Filter, ArrowUpDown, SortAsc, SortDesc, Plus, Mail, Phone, Calendar, MessageSquare, Edit, Trash2, Brain, Zap, Star, Clock, TrendingDown, Activity, ClipboardList, User, Linkedin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import LeadForm from './LeadForm';
import { analyzeSmartLeads, type SmartLeadResponse, type SmartLeadAnalysis, generateLeadPersona } from '@/lib/ai';
import EmailComposer from './EmailComposer';
import ActivityForm from './ActivityForm';
import LeadActivities from './LeadActivities';
import { CustomerPersona } from '@/lib/ai/types';
import { Lightbulb } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { searchLinkedInContacts, type LinkedInContact, type LinkedInSearchRequest, type LinkedInSearchResponse } from '@/lib/ai/linkedinEnricher';

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
}

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
}

type SortField = 'name' | 'company' | 'score' | 'status' | 'source' | 'created_at';
type SortDirection = 'asc' | 'desc';

const LeadManagement = () => {
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

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    status: 'new',
    source: 'manual'
  });

  // Smart Lead Analysis state
  const [showSmartLeadDialog, setShowSmartLeadDialog] = useState(false);
  const [smartLeadAnalysis, setSmartLeadAnalysis] = useState<SmartLeadResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Add state for email composer
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [leadForEmail, setLeadForEmail] = useState<Lead | null>(null);

  // Add state for activities
  const [selectedLeadForActivities, setSelectedLeadForActivities] = useState<Lead | null>(null);
  const [showActivitiesDialog, setShowActivitiesDialog] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);

  // Use useState and useEffect instead of React Query for activities
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // State for activity counts
  const [activityCounts, setActivityCounts] = useState<{[key: string]: number}>({});

  // Add these states for the Persona feature
  const [showPersonaDialog, setShowPersonaDialog] = useState(false);
  const [selectedLeadForPersona, setSelectedLeadForPersona] = useState<Lead | null>(null);
  const [leadPersona, setLeadPersona] = useState<CustomerPersona | null>(null);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [personaError, setPersonaError] = useState<string | null>(null);

  // Add these states for Smart Lead and LinkedIn features
  const [showSmartLeadInputDialog, setShowSmartLeadInputDialog] = useState(false);
  const [smartLeadQuery, setSmartLeadQuery] = useState('');
  const [isProcessingSmartLeadQuery, setIsProcessingSmartLeadQuery] = useState(false);

  const [showLinkedInDialog, setShowLinkedInDialog] = useState(false);
  const [linkedInQuery, setLinkedInQuery] = useState('');
  const [linkedInResults, setLinkedInResults] = useState<LinkedInContact[]>([]);
  const [isSearchingLinkedIn, setIsSearchingLinkedIn] = useState(false);
  const [linkedInError, setLinkedInError] = useState<string | null>(null);

  // Fetch leads data from Supabase
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
        name: lead.name || 'Unnamed Lead',
        email: lead.email || '',
        company: lead.company || '',
        phone: lead.phone || '',
        status: lead.status || 'new',
        source: lead.source || 'manual',
        score: lead.score || 0,
        created_at: lead.created_at
      }));
    },
    enabled: !!user,
  });

  // Fetch contacts for AI analysis
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, company, status, score, created_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading contacts:', error);
        return [];
      }

      return data;
    },
    enabled: !!user,
  });

  // Fetch deals for AI analysis
  const { data: deals = [] } = useQuery({
    queryKey: ['deals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('deals')
        .select('id, title, value, stage, outcome, contact_id, created_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading deals:', error);
        return [];
      }

      return data;
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
        const nameMatch = lead.name?.toLowerCase().includes(searchLower) || false;
        const companyMatch = lead.company?.toLowerCase().includes(searchLower) || false;
        const emailMatch = lead.email?.toLowerCase().includes(searchLower) || false;
        const phoneMatch = lead.phone?.toLowerCase().includes(searchLower) || false;
        const statusMatch = lead.status?.toLowerCase().includes(searchLower) || false;
        const sourceMatch = lead.source?.toLowerCase().includes(searchLower) || false;
        
        return nameMatch || companyMatch || emailMatch || phoneMatch || statusMatch || sourceMatch;
      });

      // Sort by relevance when searching
      filtered.sort((a, b) => {
        const aName = a.name?.toLowerCase().includes(searchLower) ? 3 : 0;
        const aCompany = a.company?.toLowerCase().includes(searchLower) ? 2 : 0;
        const aEmail = a.email?.toLowerCase().includes(searchLower) ? 1 : 0;
        const aRelevance = aName + aCompany + aEmail;

        const bName = b.name?.toLowerCase().includes(searchLower) ? 3 : 0;
        const bCompany = b.company?.toLowerCase().includes(searchLower) ? 2 : 0;
        const bEmail = b.email?.toLowerCase().includes(searchLower) ? 1 : 0;
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
            aValue = a.name?.toLowerCase() || '';
            bValue = b.name?.toLowerCase() || '';
            break;
          case 'company':
            aValue = a.company?.toLowerCase() || '';
            bValue = b.company?.toLowerCase() || '';
            break;
          case 'score':
            aValue = a.score || 0;
            bValue = b.score || 0;
            break;
          case 'status':
            const statusOrder = { 'new': 1, 'contacted': 2, 'qualified': 3, 'unqualified': 4 };
            aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
            bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
            break;
          case 'source':
            aValue = a.source || '';
            bValue = b.source || '';
            break;
          case 'created_at':
            aValue = new Date(a.created_at || 0);
            bValue = new Date(b.created_at || 0);
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
    if (!editingLead || !user) return;

    // Validation for mandatory fields
    if (!editForm.name.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter the lead's name.",
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
        .from('leads')
        .update({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          company: editForm.company.trim(),
          phone: editForm.phone.trim(),
          status: editForm.status,
          source: editForm.source
        })
        .eq('id', editingLead.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Lead updated",
        description: "Lead has been successfully updated.",
      });

      setEditingLead(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error updating lead",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingLead || !user) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', deletingLead.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Lead deleted",
        description: "Lead has been successfully deleted.",
      });

      setDeletingLead(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error deleting lead",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const convertToContact = async (lead: Lead) => {
    if (!user) return;

    try {
      // Create contact from lead
      const { error: contactError } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          name: lead.name,
          email: lead.email,
          company: lead.company,
          phone: lead.phone,
          status: 'Qualified',
          score: lead.score,
          persona: 'Converted from lead'
        });

      if (contactError) throw contactError;

      // Delete the lead
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Lead converted!",
        description: "Lead has been successfully converted to a contact.",
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

  const handleSmartLeadAnalysis = async (query?: string) => {
    if (leads.length === 0) {
      toast({
        title: "No leads to analyze",
        description: "Add some leads first to use Smart Lead analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setShowSmartLeadDialog(true);

    try {
      // Pass the query as part of user preferences if provided
      const preferences = query ? {
        query: query,
        industryFocus: ['saas', 'technology', 'healthcare'], // Default values
        dealSizePreference: 'any' as const
      } : undefined;
      
      // Use the query to influence the analysis
      const analysis = await analyzeSmartLeads({
        leads: leads.map(lead => ({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          company: lead.company,
          phone: lead.phone,
          status: lead.status,
          source: lead.source,
          score: lead.score,
          created_at: lead.created_at
        })),
        contacts: contacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          email: contact.email || '',
          company: contact.company || '',
          status: contact.status || '',
          score: contact.score || 0,
          created_at: contact.created_at
        })),
        deals: deals.map(deal => ({
          id: deal.id,
          title: deal.title,
          value: deal.value || 0,
          stage: deal.stage,
          status: deal.outcome === 'won' || deal.outcome === 'lost' ? deal.outcome : 'in_progress',
          contact_id: deal.contact_id,
          created_at: deal.created_at,
          closed_at: deal.outcome === 'won' || deal.outcome === 'lost' ? deal.created_at : undefined
        })),
        userPreferences: preferences
      });

      setSmartLeadAnalysis(analysis);
      
      toast({
        title: "Smart Lead Analysis Complete!",
        description: `Analyzed ${analysis.analysisMetadata.totalLeadsAnalyzed} leads and identified top 3 prospects.`,
      });

    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze leads. Please try again.",
        variant: "destructive",
      });
      setShowSmartLeadDialog(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add Smart Lead query submission function
  const handleSmartLeadQuerySubmit = async () => {
    if (!smartLeadQuery.trim()) return;
    
    setIsProcessingSmartLeadQuery(true);
    console.log('SMART_LEAD_QUERY: Smart lead query used in leads:', smartLeadQuery);
    
    try {
      await handleSmartLeadAnalysis(smartLeadQuery);
      setSmartLeadQuery('');
      setShowSmartLeadInputDialog(false);
    } catch (error) {
      console.error('Error processing smart lead query:', error);
      toast({
        title: "Error analyzing leads",
        description: error instanceof Error ? error.message : 'An error occurred while analyzing leads',
        variant: "destructive"
      });
    } finally {
      setIsProcessingSmartLeadQuery(false);
    }
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

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'form': return '📝';
      case 'import': return '📊';
      case 'integration': return '🔗';
      case 'manual': return '✋';
      default: return '📋';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Calculate lead metrics
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(lead => lead.status === 'qualified').length;
  const conversionRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0';
  const averageScore = totalLeads > 0 ? (leads.reduce((sum, lead) => sum + lead.score, 0) / totalLeads).toFixed(1) : '0';

  // Add function to handle email action
  const handleSendEmail = (lead: Lead) => {
    setLeadForEmail(lead);
    setShowEmailComposer(true);
  };

  // Function to handle viewing activities
  const handleViewActivities = (lead: Lead) => {
    setSelectedLeadForActivities(lead);
    setShowActivitiesDialog(true);
  };

  // Function to handle adding an activity
  const handleAddActivity = (lead?: Lead) => {
    if (lead) {
      setSelectedLeadForActivities(lead);
    }
    setShowActivityForm(true);
  };

  // Function to get activity type color
  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-purple-100 text-purple-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      case 'task': return 'bg-orange-100 text-orange-800';
      case 'note': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Add a function to load activity counts after leads are loaded
  const loadActivityCounts = async () => {
    if (!user || !leads || leads.length === 0) return;
    
    const counts: {[key: string]: number} = {};
    
    // Process in batches to avoid too many parallel requests
    const batchSize = 5;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      // Run queries in parallel for this batch
      const promises = batch.map(async (lead) => {
        try {
          const { count, error } = await supabase
            .from('activities')
            .select('id', { count: 'exact', head: true })
            .eq('lead_id', lead.id);
            
          if (error) {
            console.error(`Error loading count for lead ${lead.id}:`, error);
            return { id: lead.id, count: 0 };
          }
          
          return { id: lead.id, count: count || 0 };
        } catch (err) {
          console.error(`Failed to fetch count for lead ${lead.id}:`, err);
          return { id: lead.id, count: 0 };
        }
      });
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        counts[result.id] = result.count;
      });
    }
    
    setActivityCounts(counts);
  };

  // Load activity counts when leads change
  useEffect(() => {
    loadActivityCounts();
  }, [leads, user]);

  // Refresh activity counts after activities are updated
  useEffect(() => {
    if (selectedLeadForActivities) {
      loadActivityCounts();
    }
  }, [activities]);

  // Add function to handle LinkedIn search
  const handleLinkedInSearch = async () => {
    if (!linkedInQuery.trim()) return;
    
    setIsSearchingLinkedIn(true);
    setLinkedInError(null);
    
    try {
      const searchRequest: LinkedInSearchRequest = {
        searchQuery: linkedInQuery,
        targetIndustries: [],
        targetRoles: [],
        maxResults: 5
      };
      
      const results = await searchLinkedInContacts(searchRequest);
      setLinkedInResults(results.contacts);
    } catch (error) {
      console.error('Error searching LinkedIn:', error);
      setLinkedInError(error instanceof Error ? error.message : 'Failed to search LinkedIn');
    } finally {
      setIsSearchingLinkedIn(false);
    }
  };

  // Add function to add LinkedIn contact as lead
  const handleAddLeadFromLinkedIn = async (contact: LinkedInContact) => {
    try {
      // Convert LinkedIn contact to lead format
      const newLead = {
        name: contact.name,
        email: contact.email || '',
        company: contact.company,
        phone: contact.phone || '',
        status: 'new',
        source: 'import',
        score: contact.relevanceScore || 50,
        user_id: user?.id
      };
      
      // Add to database
      const { data, error } = await supabase
        .from('leads')
        .insert(newLead)
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Lead added successfully",
        description: `${contact.name} from ${contact.company} has been added as a new lead.`,
        variant: "default"
      });
      
      // Refresh leads list
      refetch();
      
    } catch (error) {
      console.error('Error adding lead from LinkedIn:', error);
      toast({
        title: "Error adding lead",
        description: error instanceof Error ? error.message : 'Failed to add lead',
        variant: "destructive"
      });
    }
  };

  // Add function to handle showing lead persona
  const handleShowLeadPersona = async (lead: Lead) => {
    setSelectedLeadForPersona(lead);
    setShowPersonaDialog(true);
    setLeadPersona(null);
    setPersonaError(null);
    setIsGeneratingPersona(true);
    console.log('PERSONA: Persona used in leads:', lead.name);
    
    try {
      // First, fetch lead activities
      const { data: leadActivities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
        
      if (activitiesError) throw activitiesError;
      
      // If no activities, show error
      if (!leadActivities || leadActivities.length === 0) {
        setIsGeneratingPersona(false);
        setPersonaError('No activities found for this lead. Add some interactions before generating a persona.');
        return;
      }
      
      // Generate persona based on lead and activities
      const persona = await generateLeadPersona({
        lead: {
          name: lead.name,
          email: lead.email,
          company: lead.company,
          status: lead.status,
          source: lead.source,
          score: lead.score
        },
        activities: leadActivities.map(activity => ({
          type: activity.type,
          subject: activity.subject,
          description: activity.description,
          status: activity.status,
          created_at: activity.created_at
        }))
      });
      
      setLeadPersona(persona);
    } catch (error) {
      console.error('Error generating lead persona:', error);
      setPersonaError(error instanceof Error ? error.message : 'Failed to generate persona');
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-lg">Loading leads...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lead Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium text-slate-600">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{conversionRate}%</div>
            <p className="text-xs text-slate-600">Lead to qualified</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Score</CardTitle>
            <UserPlus className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{averageScore}</div>
            <p className="text-xs text-slate-600">Quality metric</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
                Lead Management
              </CardTitle>
              <CardDescription>
                Track and nurture your sales leads
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowSmartLeadInputDialog(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Brain className="mr-2 h-4 w-4" />
                Smart Lead Query
              </Button>
              <Button
                onClick={() => setShowLinkedInDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Linkedin className="mr-2 h-4 w-4" />
                Get from LinkedIn
              </Button>
              <Button onClick={() => setShowLeadForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
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

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="form">Form</SelectItem>
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
                              {lead.company ? lead.company : 'No company'}
                            </div>
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {lead.email ? lead.email : 'No email'}
                            </div>
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {lead.phone ? lead.phone : 'No phone'}
                            </div>
                          </div>
                          
                          {/* Add Activities count and button */}
                          <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-100">
                            <div className="flex items-center text-xs text-slate-500">
                              <Activity className="h-3 w-3 mr-1" />
                              Activities
                            </div>
                            <div 
                              className="flex items-center cursor-pointer" 
                              onClick={() => handleViewActivities(lead)}
                            >
                              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium px-1.5">
                                {activityCounts[lead.id] || 0}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-slate-600">Source:</span>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {getSourceIcon(lead.source)} {lead.source}
                              </Badge>
                              <span className="text-sm text-slate-600">
                                Added {new Date(lead.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewActivities(lead)}
                              >
                                <ClipboardList className="w-4 h-4 mr-1" />
                                Activities
                              </Button>
                              <Button size="sm" variant="outline">
                                <Phone className="w-4 h-4 mr-1" />
                                Call
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => convertToContact(lead)}
                                className="hover:bg-green-50 text-green-600"
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Convert
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
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowLeadPersona(lead);
                                }}
                                disabled={!activityCounts[lead.id] || activityCounts[lead.id] === 0}
                              >
                                <User className="w-3 h-3 mr-1 text-violet-500" />
                                Persona
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

      {/* Edit Lead Dialog */}
      <Dialog open={!!editingLead} onOpenChange={() => setEditingLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update lead information. Name, company, email, and phone are required.
            </DialogDescription>
          </DialogHeader>
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
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
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

      <LeadForm 
        open={showLeadForm} 
        onOpenChange={setShowLeadForm} 
        onLeadCreated={refetch}
      />

      {/* Email Composer Dialog */}
      <EmailComposer 
        open={showEmailComposer}
        onOpenChange={setShowEmailComposer}
        prefilledTo={leadForEmail?.email || ''}
        prefilledSubject={`Regarding ${leadForEmail?.name} from ${leadForEmail?.company}`}
        leadId={leadForEmail?.id}
      />

      {/* Activities Dialog */}
      <Dialog open={showActivitiesDialog} onOpenChange={setShowActivitiesDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
              Activities for {selectedLeadForActivities?.name}
            </DialogTitle>
            <DialogDescription>
              View and manage activities related to this lead
            </DialogDescription>
          </DialogHeader>

          {selectedLeadForActivities && user && (
            <LeadActivities 
              leadId={selectedLeadForActivities.id} 
              userId={user.id} 
              onAddActivity={() => refetch()}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Activity Form */}
      <ActivityForm 
        open={showActivityForm}
        onOpenChange={setShowActivityForm}
        onActivityCreated={() => {
          refetch();
          setShowActivityForm(false);
        }}
        initialLeadId={selectedLeadForActivities?.id}
      />
      
      {/* Smart Lead Analysis Dialog */}
      <Dialog open={showSmartLeadDialog} onOpenChange={setShowSmartLeadDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              Smart Lead Analysis
            </DialogTitle>
            <DialogDescription>
              AI-powered analysis of your top 3 most promising leads based on historical data and conversion patterns.
            </DialogDescription>
          </DialogHeader>
          
          {isAnalyzing ? (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-white animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Analyzing Your Leads...
                </h3>
                <p className="text-slate-600 mb-6">
                  Our AI is analyzing {leads.length} leads using historical data, engagement patterns, and conversion factors.
                </p>
                <Progress value={66} className="w-64 mx-auto" />
              </div>
            </div>
          ) : smartLeadAnalysis ? (
            <div className="space-y-6">
              {/* Analysis Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{smartLeadAnalysis.analysisMetadata.totalLeadsAnalyzed}</div>
                  <div className="text-sm text-slate-600">Leads Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{smartLeadAnalysis.analysisMetadata.averageConversionProbability}%</div>
                  <div className="text-sm text-slate-600">Avg Conversion Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(smartLeadAnalysis.analysisMetadata.dataQualityScore)}%</div>
                  <div className="text-sm text-slate-600">Data Quality Score</div>
                </div>
              </div>

              {/* Top 3 Leads */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  Top 3 Most Promising Leads
                </h3>
                
                {smartLeadAnalysis.topLeads.map((lead, index) => {
                  const urgencyColors = {
                    critical: 'bg-red-100 text-red-800 border-red-200',
                    high: 'bg-orange-100 text-orange-800 border-orange-200',
                    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    low: 'bg-green-100 text-green-800 border-green-200'
                  };
                  
                  return (
                    <Card key={lead.leadId} className="border-2 border-slate-200">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Lead Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                                #{index + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900">{lead.leadName}</h4>
                                <p className="text-sm text-slate-600">{lead.company}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={urgencyColors[lead.urgencyLevel]}>
                                {lead.urgencyLevel.toUpperCase()}
                              </Badge>
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">{Math.round(lead.conversionProbability)}%</div>
                                <div className="text-xs text-slate-500">Conversion Probability</div>
                              </div>
                            </div>
                          </div>

                          {/* Reasoning */}
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-900">{lead.reasoning}</p>
                          </div>

                          {/* Key Factors and Actions */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-slate-900 mb-2 flex items-center">
                                <Target className="w-4 h-4 mr-1" />
                                Key Factors
                              </h5>
                              <ul className="space-y-1">
                                {lead.keyFactors.map((factor, idx) => (
                                  <li key={idx} className="text-sm text-slate-600 flex items-start">
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-slate-900 mb-2 flex items-center">
                                <Zap className="w-4 h-4 mr-1" />
                                Recommended Actions
                              </h5>
                              <ul className="space-y-1">
                                {lead.recommendedActions.map((action, idx) => (
                                  <li key={idx} className="text-sm text-slate-600 flex items-start">
                                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Timeline and Similar Profiles */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-600">
                                <span className="font-medium">Est. Conversion:</span> {lead.estimatedTimeToConversion}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-600">
                                <span className="font-medium">Confidence:</span> {Math.round(lead.confidenceScore)}%
                              </span>
                            </div>
                          </div>

                          {lead.similarSuccessfulProfiles.length > 0 && (
                            <div className="pt-2 border-t border-slate-200">
                              <h5 className="font-medium text-slate-900 mb-2 text-sm">Similar Successful Profiles:</h5>
                              <div className="flex flex-wrap gap-2">
                                {lead.similarSuccessfulProfiles.map((profile, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {profile}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Insights */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">AI Insights</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Top Conversion Factors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {smartLeadAnalysis.insights.topConversionFactors.slice(0, 3).map((factor, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-start">
                            <TrendingUp className="w-3 h-3 mt-1 mr-2 text-green-600 flex-shrink-0" />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Industry Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {smartLeadAnalysis.insights.industryTrends.slice(0, 2).map((trend, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-start">
                            <TrendingDown className="w-3 h-3 mt-1 mr-2 text-blue-600 flex-shrink-0" />
                            {trend}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Focus Areas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {smartLeadAnalysis.insights.recommendedFocusAreas.slice(0, 3).map((area, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-start">
                            <Target className="w-3 h-3 mt-1 mr-2 text-purple-600 flex-shrink-0" />
                            {area}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => setShowSmartLeadDialog(false)}>
                  Close
                </Button>
                <Button 
                  onClick={handleSmartLeadAnalysis}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Re-analyze
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Smart Lead Input Dialog */}
      <Dialog open={showSmartLeadInputDialog} onOpenChange={setShowSmartLeadInputDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smart Lead Search</DialogTitle>
            <DialogDescription>
              Describe the ideal lead you're looking for, and our AI will find the best matches from your existing leads with activity history.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Query</label>
              <Textarea
                placeholder="E.g., 'Find me leads interested in our enterprise plan who have engaged with our pricing email'"
                value={smartLeadQuery}
                onChange={(e) => setSmartLeadQuery(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <p className="font-medium">Note:</p>
              <p>This will only analyze leads that have at least one activity (interaction history).</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowSmartLeadInputDialog(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSmartLeadQuerySubmit}
              disabled={!smartLeadQuery.trim() || isProcessingSmartLeadQuery}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isProcessingSmartLeadQuery ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Find Smart Leads
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* LinkedIn Search Dialog */}
      <Dialog open={showLinkedInDialog} onOpenChange={setShowLinkedInDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>LinkedIn Lead Search</DialogTitle>
            <DialogDescription>
              Find potential leads from LinkedIn based on your search criteria.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Search Query</label>
                <Input
                  placeholder="E.g., 'Sales Directors in SaaS companies in San Francisco'"
                  value={linkedInQuery}
                  onChange={(e) => setLinkedInQuery(e.target.value)}
                />
              </div>
              <Button
                onClick={handleLinkedInSearch}
                disabled={!linkedInQuery.trim() || isSearchingLinkedIn}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSearchingLinkedIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
            
            {linkedInError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-md">
                <p className="font-medium">Error searching LinkedIn</p>
                <p className="text-sm mt-1">{linkedInError}</p>
              </div>
            )}
            
            {isSearchingLinkedIn && (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-slate-600">Searching LinkedIn for relevant contacts...</p>
              </div>
            )}
            
            {linkedInResults.length > 0 && !isSearchingLinkedIn && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Search Results</h3>
                
                <div className="space-y-4">
                  {linkedInResults.map((contact) => (
                    <Card key={contact.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <div className="p-4 md:p-6 flex-1">
                          <div className="flex items-start">
                            <div className="bg-blue-100 rounded-full p-3 mr-4">
                              <User className="w-6 h-6 text-blue-600" />
                            </div>
                            
                            <div>
                              <h4 className="text-lg font-medium">{contact.name}</h4>
                              <p className="text-sm text-slate-600">{contact.title} at {contact.company}</p>
                              <p className="text-sm text-slate-500 mt-1">{contact.location}</p>
                              
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                  {contact.industryMatch ? 'Industry Match' : 'New Industry'}
                                </Badge>
                                
                                <Badge className="bg-violet-50 text-violet-700 border-violet-200">
                                  {contact.estimatedDecisionMakingPower > 70 ? 'Key Decision Maker' : 
                                   contact.estimatedDecisionMakingPower > 50 ? 'Influencer' : 'Contributor'}
                                </Badge>
                                
                                <Badge className={`
                                  ${contact.relevanceScore > 80 ? 'bg-green-50 text-green-700 border-green-200' : 
                                   contact.relevanceScore > 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                   'bg-orange-50 text-orange-700 border-orange-200'}
                                `}>
                                  {contact.relevanceScore}% Relevant
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-xs uppercase text-slate-500 font-medium mb-1">Profile Summary</h5>
                              <p className="text-sm">{contact.profileSummary}</p>
                            </div>
                            
                            <div>
                              <h5 className="text-xs uppercase text-slate-500 font-medium mb-1">Why This Contact?</h5>
                              <p className="text-sm">{contact.alignmentReason}</p>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <h5 className="text-xs uppercase text-slate-500 font-medium mb-1">Experience</h5>
                            <ul className="text-sm space-y-1">
                              {contact.experience.slice(0, 2).map((exp, index) => (
                                <li key={index} className="text-slate-700">• {exp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 p-4 md:p-6 md:w-64 flex flex-col justify-between">
                          <div>
                            <h5 className="text-xs uppercase text-slate-500 font-medium mb-2">Contact Info</h5>
                            {contact.email && (
                              <div className="flex items-center text-sm mb-2">
                                <Mail className="w-4 h-4 mr-2 text-slate-400" />
                                <span className="text-slate-700">{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center text-sm mb-2">
                                <Phone className="w-4 h-4 mr-2 text-slate-400" />
                                <span className="text-slate-700">{contact.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center text-sm">
                              <Linkedin className="w-4 h-4 mr-2 text-slate-400" />
                              <a 
                                href={contact.linkedinUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                LinkedIn Profile
                              </a>
                            </div>
                          </div>
                          
                          <Button
                            className="mt-4 w-full"
                            onClick={() => handleAddLeadFromLinkedIn(contact)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add as Lead
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Persona Dialog */}
      <Dialog open={showPersonaDialog} onOpenChange={setShowPersonaDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Persona</DialogTitle>
            <DialogDescription>
              {selectedLeadForPersona && (
                <span>Behavioral profile for {selectedLeadForPersona.name} based on interaction history</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isGeneratingPersona && (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-slate-600">Analyzing lead interactions and generating persona...</p>
              </div>
            )}
            
            {personaError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-md">
                <p className="font-medium">Error generating persona</p>
                <p className="text-sm mt-1">{personaError}</p>
              </div>
            )}
            
            {leadPersona && !isGeneratingPersona && (
              <div className="space-y-6">
                <div className="flex items-start gap-6">
                  <div className="bg-primary/10 rounded-full p-6">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{leadPersona.name}</h3>
                    <p className="text-slate-500">{leadPersona.role} • {leadPersona.industry}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-slate-100">
                        {leadPersona.company_size} Company
                      </Badge>
                      
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {leadPersona.decision_making_style} Decision Maker
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Pain Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {leadPersona.pain_points.map((point, index) => (
                          <li key={index} className="text-sm flex gap-2">
                            <span className="text-red-500">•</span> {point}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Buying Motivations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {leadPersona.buying_motivations.map((motivation, index) => (
                          <li key={index} className="text-sm flex gap-2">
                            <span className="text-green-500">•</span> {motivation}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Communication Style</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{leadPersona.communication_style}</p>
                      
                      <div className="mt-3">
                        <p className="text-xs text-slate-500 mb-1">Preferred Channels</p>
                        <div className="flex flex-wrap gap-1">
                          {leadPersona.preferred_channels.map((channel, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Likely Objections</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {leadPersona.objections_likely.map((objection, index) => (
                          <li key={index} className="text-sm flex gap-2">
                            <span className="text-amber-500">•</span> {objection}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
                      Recommended Approach
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {leadPersona.recommended_approach}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadManagement;
