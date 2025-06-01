import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Calendar, User, MessageSquare, TrendingUp, Plus, Search, Filter, ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
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
  probability: number;
  stage: string;
  contact_name: string;
  last_activity: string;
  next_step: string;
  created_at: string;
}

interface DealsPipelineProps {
  onSelectDeal: (deal: Deal) => void;
}

type SortField = 'title' | 'company' | 'value' | 'probability' | 'stage' | 'created_at' | 'last_activity';
type SortDirection = 'asc' | 'desc';

const DealsPipeline = ({ onSelectDeal }: DealsPipelineProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDealForm, setShowDealForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [valueFilter, setValueFilter] = useState<string>('all');

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
        probability: deal.probability || 0,
        stage: deal.stage || 'Discovery',
        contact_name: deal.contact_name || '',
        last_activity: deal.last_activity ? new Date(deal.last_activity).toLocaleDateString() : 'No activity',
        next_step: deal.next_step || 'Follow up required',
        created_at: deal.created_at
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
        const nextStepMatch = deal.next_step.toLowerCase().includes(searchLower);
        const stageMatch = deal.stage.toLowerCase().includes(searchLower);
        
        return titleMatch || companyMatch || contactMatch || nextStepMatch || stageMatch;
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
          case 'probability':
            aValue = a.probability;
            bValue = b.probability;
            break;
          case 'stage':
            // Custom stage ordering
            const stageOrder = { 'Discovery': 1, 'Proposal': 2, 'Negotiation': 3, 'Closing': 4 };
            aValue = stageOrder[a.stage as keyof typeof stageOrder] || 0;
            bValue = stageOrder[b.stage as keyof typeof stageOrder] || 0;
            break;
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case 'last_activity':
            aValue = a.last_activity === 'No activity' ? new Date(0) : new Date(a.last_activity);
            bValue = b.last_activity === 'No activity' ? new Date(0) : new Date(b.last_activity);
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
  }, [deals, searchTerm, stageFilter, valueFilter, sortField, sortDirection]);

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
    setSortField('created_at');
    setSortDirection('desc');
  };

  const handleAICoach = (deal: Deal, e: React.MouseEvent) => {
    console.log('🤖 AI Coach button clicked for deal:', deal);
    console.log('🤖 Deal details:', {
      id: deal.id,
      title: deal.title,
      company: deal.company,
      value: deal.value,
      probability: deal.probability,
      stage: deal.stage
    });
    
    e.stopPropagation(); // Prevent card click
    console.log('🤖 Calling onSelectDeal with deal:', deal.title);
    onSelectDeal(deal);
    
    // Switch to AI Coach tab - we'll need to communicate this to parent
    console.log('🤖 Dispatching switchToAICoach event');
    const event = new CustomEvent('switchToAICoach', { detail: deal });
    window.dispatchEvent(event);
    console.log('🤖 AI Coach event dispatched successfully');
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
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    if (probability >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Calculate pipeline metrics
  const pipelineMetrics = useMemo(() => {
    const totalValue = filteredAndSortedDeals.reduce((sum, deal) => sum + deal.value, 0);
    const weightedValue = filteredAndSortedDeals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
    const avgDealSize = filteredAndSortedDeals.length > 0 ? totalValue / filteredAndSortedDeals.length : 0;
    
    return { totalValue, weightedValue, avgDealSize };
  }, [filteredAndSortedDeals]);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Pipeline</p>
                <p className="text-2xl font-bold text-slate-900">${pipelineMetrics.totalValue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Weighted Pipeline</p>
                <p className="text-2xl font-bold text-slate-900">${pipelineMetrics.weightedValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Deal Size</p>
                <p className="text-2xl font-bold text-slate-900">${pipelineMetrics.avgDealSize.toLocaleString()}</p>
              </div>
              <User className="w-8 h-8 text-purple-600" />
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
                Sales Pipeline
              </CardTitle>
              <CardDescription>
                Track your deals and get AI-powered recommendations
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
                  placeholder="Search deals by title, company, contact, next step..." 
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

                {(searchTerm || stageFilter !== 'all' || valueFilter !== 'all') && (
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
                { field: 'probability', label: 'Probability' },
                { field: 'stage', label: 'Stage' },
                { field: 'created_at', label: 'Date Added' },
                { field: 'last_activity', label: 'Last Activity' }
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
                {filteredAndSortedDeals.map((deal) => (
                  <Card key={deal.id} className="border border-slate-200 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onSelectDeal(deal)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">{deal.title}</h3>
                            <Badge className={getStageColor(deal.stage)}>
                              {deal.stage}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              {deal.company}
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              ${deal.value.toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {deal.last_activity}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-slate-600">Close Probability:</span>
                              <span className={`text-sm font-medium ${getProbabilityColor(deal.probability)}`}>
                                {deal.probability}%
                              </span>
                              <Progress value={deal.probability} className="w-16" />
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="hover:bg-blue-50"
                              onClick={(e) => handleAICoach(deal, e)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              AI Coach
                            </Button>
                          </div>

                          <div className="text-sm">
                            <span className="text-slate-600">Next step:</span>
                            <span className="ml-1 text-slate-900 font-medium">{deal.next_step}</span>
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

      <DealForm 
        open={showDealForm} 
        onOpenChange={setShowDealForm} 
        onDealCreated={refetch}
      />
    </div>
  );
};

export default DealsPipeline;
