import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Target, Calendar, User, MessageSquare, Plus, Search, Filter, ArrowUpDown, SortAsc, SortDesc, Edit, Trash2, Zap, Brain, Sparkles, TrendingDown, AlertTriangle, CheckCircle, Phone, Mail, Users, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import DealForm from './DealForm';
import SemanticSearchDialog from './SemanticSearchDialog';
import { batchProcessDealsForEmbeddings, analyzeDealSimilarity, type DealSimilarityResponse } from '@/lib/ai';
import ActivityForm from './ActivityForm';
import EmailComposer from './EmailComposer';

interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: string;
  probability: number;
  contact_name: string;
  last_activity: string;
  next_step: string;
  created_at: string;
  deal_status: string;
  contact_id?: string;
  activities_count?: number;
}

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  contact_name: string;
  created_at: string;
}

interface DealsPipelineProps {
  onSelectDeal?: (deal: Deal) => void;
}

type SortField = 'title' | 'company' | 'value' | 'stage' | 'probability' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface DealActivitiesCount {
  [dealId: string]: number;
}

interface SimilarDeal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  similarity: number;
  deal_status: string;
  company?: string;
  similarity_score?: number;
  similarity_reasons?: string[];
  key_differences?: string[];
}

const DealsPipeline = ({ onSelectDeal }: DealsPipelineProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDealForm, setShowDealForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deletingDeal, setDeletingDeal] = useState<Deal | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [valueFilter, setValueFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    company: '',
    value: '',
    stage: '',
    probability: '',
    deal_status: ''
  });

  // AI Embedding state
  const [showSemanticSearch, setShowSemanticSearch] = useState(false);
  const [isProcessingEmbeddings, setIsProcessingEmbeddings] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedDealForRecommendations, setSelectedDealForRecommendations] = useState<Deal | null>(null);
  const [dealSimilarityAnalysis, setDealSimilarityAnalysis] = useState<DealSimilarityResponse | null>(null);
  const [isAnalyzingSimilarity, setIsAnalyzingSimilarity] = useState(false);

  // Activity state
  const [selectedDealActivities, setSelectedDealActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [dealActivitiesCount, setDealActivitiesCount] = useState<DealActivitiesCount>({});
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [selectedDealForActivity, setSelectedDealForActivity] = useState<Deal | null>(null);

  // Add this state for managing activities view
  const [showDealActivities, setShowDealActivities] = useState(false);
  const [selectedDealForActivitiesView, setSelectedDealForActivitiesView] = useState<Deal | null>(null);

  // Add this state for email functionality
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [selectedDealForEmail, setSelectedDealForEmail] = useState<Deal | null>(null);

  const { data: deals = [], isLoading, refetch } = useQuery({
    queryKey: ['deals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading deals",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      const dealsData = data.map(deal => ({
        id: deal.id,
        title: deal.title,
        company: deal.company || '',
        value: Number(deal.value),
        stage: deal.stage || 'Discovery',
        probability: deal.probability || 0,
        contact_name: deal.contact_name || '',
        last_activity: deal.last_activity ? new Date(deal.last_activity).toLocaleDateString() : 'No activity',
        next_step: deal.next_step || 'Follow up required',
        created_at: deal.created_at,
        deal_status: deal.deal_status || deal.outcome || 'in_progress',
        contact_id: deal.contact_id
      }));

      // Fetch activity counts for all deals
      await fetchActivitiesCounts(dealsData.map(d => d.id));
      
      return dealsData;
    },
    enabled: !!user,
  });

  // Function to fetch activity counts for deals
  const fetchActivitiesCounts = async (dealIds: string[]) => {
    if (!user || dealIds.length === 0) return;
    
    try {
      // Use a manual count since some DBs might not support group by in this context
      const { data, error } = await supabase
        .from('activities')
        .select('deal_id')
        .eq('user_id', user.id)
        .in('deal_id', dealIds);

      if (error) throw error;

      // Count occurrences of each deal_id
      const countsMap: DealActivitiesCount = {};
      data.forEach(item => {
        if (item.deal_id) {
          countsMap[item.deal_id] = (countsMap[item.deal_id] || 0) + 1;
        }
      });
      
      // Set counts for deals with no activities to 0
      dealIds.forEach(id => {
        if (!countsMap[id]) countsMap[id] = 0;
      });
      
      setDealActivitiesCount(countsMap);
    } catch (error: any) {
      console.error('Error fetching activity counts:', error);
    }
  };

  // Advanced search and filter algorithm
  const filteredAndSortedDeals = useMemo(() => {
    let filtered = deals;

    // Search algorithm - searches across multiple fields with weighted relevance
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = deals.filter(deal => {
        const titleMatch = deal.title.toLowerCase().includes(searchLower);
        const companyMatch = deal.company.toLowerCase().includes(searchLower);
        const contactMatch = deal.contact_name.toLowerCase().includes(searchLower);
        const stageMatch = deal.stage.toLowerCase().includes(searchLower);
        const nextStepMatch = deal.next_step.toLowerCase().includes(searchLower);
        
        return titleMatch || companyMatch || contactMatch || stageMatch || nextStepMatch;
      });

      // Sort by relevance when searching
      filtered.sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(searchLower) ? 3 : 0;
        const aCompany = a.company.toLowerCase().includes(searchLower) ? 2 : 0;
        const aContact = a.contact_name.toLowerCase().includes(searchLower) ? 1 : 0;
        const aRelevance = aTitle + aCompany + aContact;

        const bTitle = b.title.toLowerCase().includes(searchLower) ? 3 : 0;
        const bCompany = b.company.toLowerCase().includes(searchLower) ? 2 : 0;
        const bContact = b.contact_name.toLowerCase().includes(searchLower) ? 1 : 0;
        const bRelevance = bTitle + bCompany + bContact;

        return bRelevance - aRelevance;
      });
    }

    // Stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(deal => deal.stage === stageFilter);
    }

    // Outcome filter
    if (outcomeFilter !== 'all') {
      filtered = filtered.filter(deal => deal.deal_status === outcomeFilter);
    }

    // Value filter
    if (valueFilter !== 'all') {
      switch (valueFilter) {
        case 'high':
          filtered = filtered.filter(deal => deal.value >= 100000);
          break;
        case 'medium':
          filtered = filtered.filter(deal => deal.value >= 25000 && deal.value < 100000);
          break;
        case 'low':
          filtered = filtered.filter(deal => deal.value < 25000);
          break;
      }
    }

    // Sorting algorithm
    if (!searchTerm.trim()) { // Only apply custom sorting when not searching
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'company':
            aValue = a.company.toLowerCase();
            bValue = b.company.toLowerCase();
            break;
          case 'value':
            aValue = a.value;
            bValue = b.value;
            break;
          case 'stage':
            const stageOrder = { 'Discovery': 1, 'Proposal': 2, 'Negotiation': 3, 'Closing': 4 };
            aValue = stageOrder[a.stage as keyof typeof stageOrder] || 0;
            bValue = stageOrder[b.stage as keyof typeof stageOrder] || 0;
            break;
          case 'probability':
            aValue = a.probability;
            bValue = b.probability;
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
  }, [deals, searchTerm, stageFilter, valueFilter, outcomeFilter, sortField, sortDirection]);

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
    setStageFilter('all');
    setValueFilter('all');
    setOutcomeFilter('all');
    setSortField('created_at');
    setSortDirection('desc');
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setEditForm({
      title: deal.title,
      company: deal.company || '',
      value: deal.value?.toString() || '',
      stage: deal.stage || 'Discovery',
      probability: deal.probability?.toString() || '50',
      deal_status: deal.deal_status || 'in_progress'
    });
    
    // Fetch activities for this deal
    fetchDealActivities(deal.id);
  };

  const handleSaveEdit = async () => {
    if (!editingDeal || !user) return;

    if (!editForm.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!editForm.value || isNaN(Number(editForm.value))) {
      toast({
        title: "Error",
        description: "Valid value is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('deals')
        .update({
          title: editForm.title.trim(),
          company: editForm.company.trim(),
          value: Number(editForm.value),
          stage: editForm.stage,
          probability: editForm.deal_status === 'in_progress' ? (Number(editForm.probability) || 0) : null,
          deal_status: editForm.deal_status
        })
        .eq('id', editingDeal.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Deal updated",
        description: "Deal has been successfully updated.",
      });

      setEditingDeal(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error updating deal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingDeal || !user) return;

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', deletingDeal.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Deal deleted",
        description: "Deal has been successfully deleted.",
      });

      setDeletingDeal(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error deleting deal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAICoach = (deal: Deal) => {
    console.log('🧠 DealsPipeline: AI Coach requested for deal:', deal.title);
    console.log('🧠 DealsPipeline: Deal object:', deal);
    
    // Dispatch custom event to switch to AI Coach tab
    const event = new CustomEvent('switchToAICoach', { 
      detail: deal 
    });
    console.log('🧠 DealsPipeline: Dispatching switchToAICoach event with detail:', event.detail);
    window.dispatchEvent(event);
    console.log('🧠 DealsPipeline: Event dispatched successfully');
    
    // Also call onSelectDeal for backward compatibility
    if (onSelectDeal) {
      console.log('🧠 DealsPipeline: Calling onSelectDeal with deal:', deal.title);
      onSelectDeal(deal);
    }
    
    // Additional fallback: Try to trigger tab change via URL hash or other method
    setTimeout(() => {
      console.log('🧠 DealsPipeline: Fallback check - verifying AI Coach opened');
      // This timeout allows us to check if the event worked
    }, 100);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Discovery': return 'bg-blue-100 text-blue-800';
      case 'Proposal': return 'bg-yellow-100 text-yellow-800';
      case 'Negotiation': return 'bg-orange-100 text-orange-800';
      case 'Closing': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 75) return 'text-green-600';
    if (probability >= 50) return 'text-yellow-600';
    if (probability >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'won': return 'bg-green-100 text-green-800 border-green-200';
      case 'lost': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'won': return '🏆';
      case 'lost': return '❌';
      case 'in_progress': return '⏳';
      default: return '⏳';
    }
  };

  // AI Embedding Functions
  const handleBatchProcessEmbeddings = async () => {
    if (!user) return;

    setIsProcessingEmbeddings(true);
    try {
      const result = await batchProcessDealsForEmbeddings(user.id);
      
      toast({
        title: "Embeddings Generated!",
        description: `Processed ${result.processed} deals with ${result.errors} errors. AI search is now available.`,
      });

      // Show details in console for debugging
      console.log('Batch embedding results:', result);

    } catch (error: any) {
      console.error('Error processing embeddings:', error);
      toast({
        title: "Embedding generation failed",
        description: error.message || "Failed to generate embeddings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingEmbeddings(false);
    }
  };

  const handleGetDealRecommendations = async (deal: Deal) => {
    if (!user) return;

    setSelectedDealForRecommendations(deal);
    setShowRecommendations(true);
    setIsAnalyzingSimilarity(true);
    setDealSimilarityAnalysis(null);

    try {
      const analysis = await analyzeDealSimilarity({
        dealId: deal.id,
        userId: user.id,
        maxSimilarDeals: 5,
        includeRecommendations: true
      });
      
      setDealSimilarityAnalysis(analysis);

      toast({
        title: "AI Analysis Complete!",
        description: `Found ${analysis.similar_deals.length} similar deals and generated ${analysis.recommendations.length} recommendations.`,
      });

    } catch (error: any) {
      console.error('Error getting deal similarity analysis:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze deal similarity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingSimilarity(false);
    }
  };

  const handleSemanticSearchResult = (result: any) => {
    // Find the deal in our current list and select it
    const deal = deals.find(d => d.id === result.id);
    if (deal && onSelectDeal) {
      onSelectDeal(deal);
    }
    
    toast({
      title: "Deal Selected",
      description: `Selected "${result.title || result.name}" with ${(result.similarity * 100).toFixed(1)}% similarity.`,
    });
  };

  // Calculate pipeline metrics
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedValue = deals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
  const averageDealSize = deals.length > 0 ? totalValue / deals.length : 0;
  
  // Calculate outcome metrics
  const wonDeals = deals.filter(deal => deal.deal_status === 'won').length;
  const lostDeals = deals.filter(deal => deal.deal_status === 'lost').length;
  const inProgressDeals = deals.filter(deal => deal.deal_status === 'in_progress').length;
  const wonValue = deals.filter(deal => deal.deal_status === 'won').reduce((sum, deal) => sum + deal.value, 0);

  // Fetch activities for a deal
  const fetchDealActivities = async (dealId: string) => {
    if (!user) return;
    
    setIsLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          contacts(name)
        `)
        .eq('deal_id', dealId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const activities = data.map(activity => ({
        id: activity.id,
        type: activity.type,
        subject: activity.subject || '',
        description: activity.description || '',
        status: activity.status,
        priority: activity.priority,
        due_date: activity.due_date || '',
        contact_name: activity.contacts?.name || '',
        created_at: activity.created_at
      }));

      setSelectedDealActivities(activities);
    } catch (error: any) {
      console.error('Error fetching deal activities:', error);
      toast({
        title: "Error loading activities",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Add this function to handle opening the activity form
  const handleAddActivity = (deal: Deal) => {
    setSelectedDealForActivity(deal);
    setShowActivityForm(true);
  };

  // Update the activity creation handler
  const handleActivityCreated = () => {
    // Refresh activities for the currently edited deal
    if (editingDeal) {
      fetchDealActivities(editingDeal.id);
    }
    
    // Refresh activity counts for all deals
    fetchActivitiesCounts(deals.map(d => d.id));
  };

  // Add this function to handle viewing activities for a deal
  const handleViewActivities = (deal: Deal) => {
    setSelectedDealForActivitiesView(deal);
    fetchDealActivities(deal.id);
    setShowDealActivities(true);
  };

  // Add function to handle sending an email
  const handleSendEmail = (deal: Deal) => {
    setSelectedDealForEmail(deal);
    setShowEmailComposer(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-lg">Loading deals...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-slate-600">{deals.length} active deals</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Won Deals</CardTitle>
            <div className="text-green-600">🏆</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{wonDeals}</div>
            <p className="text-xs text-slate-600">${wonValue.toLocaleString()} value</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">In Progress</CardTitle>
            <div className="text-blue-600">⏳</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{inProgressDeals}</div>
            <p className="text-xs text-slate-600">Active opportunities</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Lost Deals</CardTitle>
            <div className="text-red-600">❌</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{lostDeals}</div>
            <p className="text-xs text-slate-600">Closed lost</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Sales Pipeline
              </CardTitle>
              <CardDescription>
                Track and manage your sales opportunities
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={() => setShowDealForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Deal
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
                  placeholder="Search deals by title, company, contact..." 
                  className="flex-1" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="Discovery">Discovery</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Closing">Closing</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={valueFilter} onValueChange={setValueFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Values</SelectItem>
                    <SelectItem value="high">High ($100K+)</SelectItem>
                    <SelectItem value="medium">Medium ($25K-$100K)</SelectItem>
                    <SelectItem value="low">Low (&lt;$25K)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outcomes</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>

                {(searchTerm || stageFilter !== 'all' || valueFilter !== 'all' || outcomeFilter !== 'all') && (
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
                { field: 'title', label: 'Title' },
                { field: 'company', label: 'Company' },
                { field: 'value', label: 'Value' },
                { field: 'stage', label: 'Stage' },
                { field: 'probability', label: 'Probability' },
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
              Showing {filteredAndSortedDeals.length} of {deals.length} deals
              {searchTerm && ` matching "${searchTerm}"`}
            </div>

            {filteredAndSortedDeals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  {deals.length === 0 ? "No deals found. Create your first deal to get started!" : "No deals match your search criteria."}
                </p>
                {deals.length === 0 ? (
                  <Button onClick={() => setShowDealForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Deal
                  </Button>
                ) : (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredAndSortedDeals.map((deal) => {
                  return (
                    <Card key={deal.id} className="border border-slate-200 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-slate-900">{deal.title}</h3>
                              <div className="flex items-center space-x-2">
                                <Badge className={getStageColor(deal.stage)}>
                                  {deal.stage}
                                </Badge>
                                <Badge className={`${getOutcomeColor(deal.deal_status)} border`}>
                                  {getOutcomeIcon(deal.deal_status)} {deal.deal_status === 'in_progress' ? 'In Progress' : deal.deal_status.charAt(0).toUpperCase() + deal.deal_status.slice(1)}
                                </Badge>
                                <span className="text-lg font-bold text-slate-900">
                                  ${deal.value.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-sm text-slate-600">
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{deal.contact_name || 'No contact'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{deal.company || 'No company'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(deal.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-slate-600">Close Probability:</span>
                                  {deal.deal_status === 'in_progress' && (
                                    <>
                                      <span className={`text-sm font-medium ${getProbabilityColor(deal.probability)}`}>
                                        {deal.probability}%
                                      </span>
                                      <Progress value={deal.probability} className="w-20" />
                                    </>
                                  )}
                                  {deal.deal_status !== 'in_progress' && (
                                    <Badge variant="outline" className="text-blue-600">
                                      Probability not available
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-slate-600">Activities:</span>
                                  <Badge variant="outline" className="text-blue-600">
                                    {dealActivitiesCount[deal.id] || 0}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleViewActivities(deal)}
                                  className="hover:bg-green-50 text-green-600 border-green-200"
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  View Activities
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleAddActivity(deal)}
                                  className="hover:bg-blue-50 text-blue-600 border-blue-200"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add Activity
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleSendEmail(deal)}
                                  className="hover:bg-blue-50 text-blue-600 border-blue-200"
                                >
                                  <Mail className="w-4 h-4 mr-1" />
                                  Email
                                </Button>
                                <Button
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleEdit(deal)}
                                  className="hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setDeletingDeal(deal)}
                                  className="hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-2 rounded text-sm">
                              <strong>Next Step:</strong> {deal.next_step}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Deal Dialog */}
      <Dialog open={!!editingDeal} onOpenChange={() => setEditingDeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
            <DialogDescription>
              Update deal information. Title and value are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Deal title"
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
              <label className="text-sm font-medium">Value *</label>
              <Input
                value={editForm.value}
                onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                placeholder="Deal value"
                type="number"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stage</label>
              <Select value={editForm.stage} onValueChange={(value) => setEditForm({ ...editForm, stage: value })}>
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
            <div>
              <label className="text-sm font-medium">Deal Status</label>
              <Select value={editForm.deal_status} onValueChange={(value) => setEditForm({ ...editForm, deal_status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.deal_status === 'in_progress' && (
              <div>
                <label className="text-sm font-medium">Probability (%)</label>
                <Input
                  value={editForm.probability}
                  onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })}
                  placeholder="Close probability"
                  type="number"
                  min="0"
                  max="100"
                />
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingDeal(null)}>
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
      <AlertDialog open={!!deletingDeal} onOpenChange={() => setDeletingDeal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDeal?.title}"? This action cannot be undone.
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

      <DealForm 
        open={showDealForm} 
        onOpenChange={setShowDealForm} 
        onDealCreated={refetch}
      />

      {/* Semantic Search Dialog */}
      <SemanticSearchDialog
        open={showSemanticSearch}
        onOpenChange={setShowSemanticSearch}
        onSelectResult={handleSemanticSearchResult}
      />

      {/* Deal Recommendations Dialog */}
      <Dialog open={showRecommendations} onOpenChange={setShowRecommendations}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-orange-600" />
              AI Deal Similarity Analysis
            </DialogTitle>
            <DialogDescription>
              LLM-powered insights based on similar deals and historical patterns
            </DialogDescription>
          </DialogHeader>

          {selectedDealForRecommendations && (
            <div className="space-y-6">
              {/* Current Deal Info */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-2">Current Deal</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedDealForRecommendations.title}</p>
                    <p className="text-sm text-slate-600">{selectedDealForRecommendations.company} • {selectedDealForRecommendations.stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${selectedDealForRecommendations.value.toLocaleString()}</p>
                    <p className="text-sm text-slate-600">{selectedDealForRecommendations.probability}% probability</p>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isAnalyzingSimilarity && (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
                  <p className="text-slate-600">AI is analyzing deal patterns and generating insights...</p>
                </div>
              )}

              {/* Analysis Results */}
              {dealSimilarityAnalysis && !isAnalyzingSimilarity && (
                <>
                  {/* Analysis Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{dealSimilarityAnalysis.similar_deals.length}</div>
                      <div className="text-sm text-slate-600">Similar Deals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{dealSimilarityAnalysis.analysis_summary.average_similarity.toFixed(1)}%</div>
                      <div className="text-sm text-slate-600">Avg Similarity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{dealSimilarityAnalysis.recommendations.length}</div>
                      <div className="text-sm text-slate-600">Recommendations</div>
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-900 flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-blue-600" />
                      AI Recommendations
                    </h3>
                    <div className="space-y-3">
                      {dealSimilarityAnalysis.recommendations.map((recommendation, index) => {
                        const getPriorityColor = (priority: string) => {
                          switch (priority) {
                            case 'high': return 'bg-red-50 border-red-200 text-red-900';
                            case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-900';
                            case 'low': return 'bg-green-50 border-green-200 text-green-900';
                            default: return 'bg-blue-50 border-blue-200 text-blue-900';
                          }
                        };

                        const getPriorityIcon = (priority: string) => {
                          switch (priority) {
                            case 'high': return <AlertTriangle className="w-4 h-4" />;
                            case 'medium': return <TrendingUp className="w-4 h-4" />;
                            case 'low': return <CheckCircle className="w-4 h-4" />;
                            default: return <Target className="w-4 h-4" />;
                          }
                        };

                        return (
                          <Card key={index} className={`border ${getPriorityColor(recommendation.priority)}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {getPriorityIcon(recommendation.priority)}
                                  <h4 className="font-semibold">{recommendation.title}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {recommendation.type.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">{recommendation.confidence}% confidence</div>
                                  <div className="text-xs text-slate-500">{recommendation.priority} priority</div>
                                </div>
                              </div>
                              <p className="text-sm mb-2">{recommendation.description}</p>
                              <div className="bg-white p-2 rounded border border-slate-200 mb-2">
                                <strong className="text-xs text-slate-600">Action:</strong>
                                <p className="text-sm">{recommendation.action}</p>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-600">
                                <span><strong>Expected Impact:</strong> {recommendation.expected_impact}</span>
                                {recommendation.based_on_deals.length > 0 && (
                                  <span>Based on {recommendation.based_on_deals.length} similar deals</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Similar Deals */}
                  {dealSimilarityAnalysis.similar_deals.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-slate-900 flex items-center">
                        <Target className="w-5 h-5 mr-2 text-green-600" />
                        Similar Deals ({dealSimilarityAnalysis.similar_deals.length})
                      </h3>
                      <div className="space-y-3">
                        {dealSimilarityAnalysis.similar_deals.map((similarDeal, index) => (
                          <Card key={index} className="border border-slate-200">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="font-medium text-slate-900">{similarDeal.title}</h4>
                                    <Badge className={`text-xs ${
                                      similarDeal.deal_status === 'won' ? 'bg-green-100 text-green-800' :
                                      similarDeal.deal_status === 'lost' ? 'bg-red-100 text-red-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {similarDeal.deal_status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-600">{similarDeal.company} • {similarDeal.stage}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">${similarDeal.value?.toLocaleString()}</p>
                                  <p className="text-sm text-green-600">{similarDeal.similarity_score}% similar</p>
                                </div>
                              </div>
                              
                              {similarDeal.similarity_reasons.length > 0 && (
                                <div className="mb-2">
                                  <strong className="text-xs text-slate-600">Why it's similar:</strong>
                                  <ul className="text-sm text-slate-700 mt-1">
                                    {similarDeal.similarity_reasons.map((reason, idx) => (
                                      <li key={idx} className="flex items-center space-x-1">
                                        <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                                        <span>{reason}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {similarDeal.key_differences.length > 0 && (
                                <div>
                                  <strong className="text-xs text-slate-600">Key differences:</strong>
                                  <ul className="text-sm text-slate-700 mt-1">
                                    {similarDeal.key_differences.map((diff, idx) => (
                                      <li key={idx} className="flex items-center space-x-1">
                                        <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                                        <span>{diff}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pattern Insights */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-900 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                      Pattern Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-800 mb-2">Success Factors</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          {dealSimilarityAnalysis.analysis_summary.success_factors.map((factor, idx) => (
                            <li key={idx} className="flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <h4 className="font-medium text-red-800 mb-2">Risk Factors</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {dealSimilarityAnalysis.analysis_summary.risk_factors.map((risk, idx) => (
                            <li key={idx} className="flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    {dealSimilarityAnalysis.analysis_summary.pattern_insights.length > 0 && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-800 mb-2">Key Insights</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          {dealSimilarityAnalysis.analysis_summary.pattern_insights.map((insight, idx) => (
                            <li key={idx} className="flex items-center space-x-1">
                              <Brain className="w-3 h-3" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => setShowRecommendations(false)}>
                  Close
                </Button>
                {selectedDealForRecommendations && (
                  <Button 
                    onClick={() => {
                      setShowRecommendations(false);
                      handleAICoach(selectedDealForRecommendations);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Get AI Coach
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Activities for the selected deal */}
      {editingDeal && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Activities for this Deal</CardTitle>
            <CardDescription>All activities associated with {editingDeal.title}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivities ? (
              <div className="py-4 text-center">Loading activities...</div>
            ) : selectedDealActivities.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">No activities found for this deal</div>
            ) : (
              <div className="space-y-2">
                {selectedDealActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start p-3 border rounded-lg bg-white">
                    <div className={`mr-3 p-2 rounded-full ${getActivityTypeColor(activity.type)}`}>
                      {getActivityTypeIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{activity.subject}</h4>
                        <Badge variant={activity.status === 'completed' ? 'default' : 'outline'}>
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                      )}
                      <div className="flex items-center mt-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3 mr-1" />
                        <span className="mr-2">{activity.contact_name}</span>
                        {activity.due_date && (
                          <>
                            <Calendar className="w-3 h-3 mr-1 ml-2" />
                            <span>{new Date(activity.due_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ActivityForm component at the end */}
      <ActivityForm
        open={showActivityForm}
        onOpenChange={setShowActivityForm}
        onActivityCreated={handleActivityCreated}
        initialDealId={selectedDealForActivity?.id}
      />

      {/* Activities View Dialog */}
      <Dialog open={showDealActivities} onOpenChange={setShowDealActivities}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
              {selectedDealForActivitiesView && `Activities for ${selectedDealForActivitiesView.title}`}
            </DialogTitle>
            <DialogDescription>
              View and manage activities related to this deal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <div>
                {selectedDealForActivitiesView && (
                  <p className="text-sm text-slate-600">
                    {dealActivitiesCount[selectedDealForActivitiesView.id] || 0} activities found for this deal
                  </p>
                )}
              </div>
              <Button 
                onClick={() => {
                  if (selectedDealForActivitiesView) {
                    handleAddActivity(selectedDealForActivitiesView);
                    setShowDealActivities(false);
                  }
                }} 
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Activity
              </Button>
            </div>
            
            {/* Loading State */}
            {isLoadingActivities && (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600">Loading activities...</p>
              </div>
            )}
            
            {/* Activities List */}
            {!isLoadingActivities && selectedDealActivities.length === 0 && (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <p className="text-slate-600">No activities found for this deal</p>
                <p className="text-sm text-slate-500 mt-2">Add activities to track your interactions</p>
              </div>
            )}
            
            {!isLoadingActivities && selectedDealActivities.length > 0 && (
              <div className="space-y-3">
                {selectedDealActivities.map((activity) => (
                  <Card key={activity.id} className="border border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className={`
                              ${activity.type === 'call' ? 'bg-blue-100 text-blue-800' : 
                                activity.type === 'email' ? 'bg-purple-100 text-purple-800' :
                                activity.type === 'meeting' ? 'bg-green-100 text-green-800' :
                                activity.type === 'task' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-slate-100 text-slate-800'}
                            `}>
                              {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                            </Badge>
                            <h4 className="font-medium text-slate-900">{activity.subject}</h4>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            {activity.description || 'No description provided'}
                          </p>
                          <div className="flex items-center space-x-3 text-xs text-slate-500">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{activity.contact_name || 'No contact'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(activity.created_at).toLocaleString()}</span>
                            </div>
                            <Badge className={`
                              ${activity.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-slate-100 text-slate-800'}
                            `}>
                              {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Composer Dialog */}
      <Dialog open={showEmailComposer} onOpenChange={setShowEmailComposer}>
        <DialogContent className="max-w-4xl">
          {selectedDealForEmail && (
            <EmailComposer 
              open={showEmailComposer}
              onOpenChange={setShowEmailComposer}
              prefilledSubject={`Regarding ${selectedDealForEmail.title} - ${selectedDealForEmail.company}`}
              dealId={selectedDealForEmail.id}
              contactId={selectedDealForEmail.contact_id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealsPipeline;

const getActivityTypeColor = (type: string) => {
  switch (type) {
    case 'call':
      return 'bg-blue-100 text-blue-600';
    case 'email':
      return 'bg-purple-100 text-purple-600';
    case 'meeting':
      return 'bg-green-100 text-green-600';
    case 'task':
      return 'bg-amber-100 text-amber-600';
    case 'note':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case 'call':
      return <Phone className="w-4 h-4" />;
    case 'email':
      return <Mail className="w-4 h-4" />;
    case 'meeting':
      return <Users className="w-4 h-4" />;
    case 'task':
      return <CheckCircle className="w-4 h-4" />;
    case 'note':
      return <FileText className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
};
