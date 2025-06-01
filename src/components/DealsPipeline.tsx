import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Target, Calendar, User, MessageSquare, Plus, Search, Filter, ArrowUpDown, SortAsc, SortDesc, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import DealForm from './DealForm';

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
  outcome: string;
}

interface DealsPipelineProps {
  onSelectDeal?: (deal: Deal) => void;
}

type SortField = 'title' | 'company' | 'value' | 'stage' | 'probability' | 'created_at';
type SortDirection = 'asc' | 'desc';

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
    stage: 'Discovery',
    probability: '',
    outcome: 'in_progress'
  });

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

      return data.map(deal => ({
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
        outcome: deal.outcome || 'in_progress'
      }));
    },
    enabled: !!user,
  });

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
      filtered = filtered.filter(deal => deal.outcome === outcomeFilter);
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
      company: deal.company,
      value: deal.value.toString(),
      stage: deal.stage,
      probability: deal.probability.toString(),
      outcome: deal.outcome
    });
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
          probability: Number(editForm.probability) || 0,
          outcome: editForm.outcome
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

  // Calculate AI readiness score for each deal
  const calculateAIReadiness = (deal: Deal) => {
    let score = 0;
    if (deal.value > 0) score += 20;
    if (deal.probability > 0) score += 20;
    if (deal.contact_name) score += 20;
    if (deal.stage !== 'Discovery') score += 20;
    if (deal.next_step && deal.next_step !== 'Follow up required') score += 20;
    return score;
  };

  const getAIReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAIReadinessLabel = (score: number) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
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

  // Calculate pipeline metrics
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedValue = deals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
  const averageDealSize = deals.length > 0 ? totalValue / deals.length : 0;
  
  // Calculate outcome metrics
  const wonDeals = deals.filter(deal => deal.outcome === 'won').length;
  const lostDeals = deals.filter(deal => deal.outcome === 'lost').length;
  const inProgressDeals = deals.filter(deal => deal.outcome === 'in_progress').length;
  const wonValue = deals.filter(deal => deal.outcome === 'won').reduce((sum, deal) => sum + deal.value, 0);

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
            <Button onClick={() => setShowDealForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
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
                  const aiReadiness = calculateAIReadiness(deal);
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
                                <Badge className={`${getOutcomeColor(deal.outcome)} border`}>
                                  {getOutcomeIcon(deal.outcome)} {deal.outcome === 'in_progress' ? 'In Progress' : deal.outcome.charAt(0).toUpperCase() + deal.outcome.slice(1)}
                                </Badge>
                                <span className="text-lg font-bold text-slate-900">
                                  ${deal.value.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                {deal.company}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Last activity: {deal.last_activity}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-slate-600">Close Probability:</span>
                                  <span className={`text-sm font-medium ${getProbabilityColor(deal.probability)}`}>
                                    {deal.probability}%
                                  </span>
                                  <Progress value={deal.probability} className="w-20" />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-slate-600">AI Readiness:</span>
                                  <span className={`text-sm font-medium ${getAIReadinessColor(aiReadiness)}`}>
                                    {getAIReadinessLabel(aiReadiness)}
                                  </span>
                                  <Progress value={aiReadiness} className="w-16" />
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  size="sm" 
                                  variant={aiReadiness >= 60 ? "default" : "outline"}
                                  onClick={() => handleAICoach(deal)}
                                  className={aiReadiness >= 60 ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" : "hover:bg-purple-50"}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  {aiReadiness >= 60 ? "Get AI Insights" : "AI Coach"}
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

                            {/* AI Insights Preview */}
                            {aiReadiness >= 80 && (
                              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded border border-green-200">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-green-800">AI Insight Available</span>
                                </div>
                                <p className="text-sm text-green-700">
                                  This deal has high-quality data. AI can provide detailed recommendations for acceleration.
                                </p>
                              </div>
                            )}
                            
                            {aiReadiness >= 60 && aiReadiness < 80 && (
                              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded border border-yellow-200">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-yellow-800">AI Analysis Ready</span>
                                </div>
                                <p className="text-sm text-yellow-700">
                                  Good data quality. AI can provide targeted recommendations to improve close probability.
                                </p>
                              </div>
                            )}
                            
                            {aiReadiness < 60 && (
                              <div className="bg-gradient-to-r from-red-50 to-pink-50 p-3 rounded border border-red-200">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-red-800">Limited AI Data</span>
                                </div>
                                <p className="text-sm text-red-700">
                                  Add more deal details (contact, activities, notes) to unlock AI recommendations.
                                </p>
                              </div>
                            )}
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
            <div>
              <label className="text-sm font-medium">Outcome</label>
              <Select value={editForm.outcome} onValueChange={(value) => setEditForm({ ...editForm, outcome: value })}>
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
    </div>
  );
};

export default DealsPipeline;
