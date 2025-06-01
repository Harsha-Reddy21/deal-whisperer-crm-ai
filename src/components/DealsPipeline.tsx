
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Calendar, User, MessageSquare, TrendingUp, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import DealForm from './DealForm';
import SmartFilters from './SmartFilters';

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
}

interface DealsPipelineProps {
  onSelectDeal: (deal: Deal) => void;
}

const DealsPipeline = ({ onSelectDeal }: DealsPipelineProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDealForm, setShowDealForm] = useState(false);
  const [filters, setFilters] = useState({});

  const { data: allDeals = [], isLoading, refetch } = useQuery({
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
        next_step: deal.next_step || 'Follow up required'
      }));
    },
    enabled: !!user,
  });

  // Apply filters to deals
  const filteredDeals = allDeals.filter(deal => {
    // Smart filters
    if (filters.smart === 'high-risk') {
      return deal.probability <= 40;
    }
    if (filters.smart === 'stalled') {
      const daysSinceActivity = Math.floor((new Date().getTime() - new Date(deal.last_activity).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceActivity >= 7;
    }
    if (filters.smart === 'needs-attention') {
      const daysSinceActivity = Math.floor((new Date().getTime() - new Date(deal.last_activity).getTime()) / (1000 * 60 * 60 * 24));
      return (deal.stage === 'Discovery' || deal.stage === 'Proposal') && daysSinceActivity >= 3;
    }

    // Standard filters
    if (filters.stage && deal.stage !== filters.stage) return false;
    
    if (filters.valueRange) {
      const [min, max] = filters.valueRange.split('-').map(v => v.replace('+', ''));
      const minValue = parseInt(min) || 0;
      const maxValue = max ? parseInt(max) : Infinity;
      if (deal.value < minValue || deal.value > maxValue) return false;
    }

    if (filters.probability) {
      if (filters.probability === 'high' && deal.probability < 70) return false;
      if (filters.probability === 'medium' && (deal.probability < 40 || deal.probability >= 70)) return false;
      if (filters.probability === 'low' && deal.probability >= 40) return false;
    }

    return true;
  });

  const handleAICoach = (deal: Deal, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectDeal(deal);
    const event = new CustomEvent('switchToAICoach', { detail: deal });
    window.dispatchEvent(event);
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
          <SmartFilters onFilterChange={setFilters} activeFilters={filters} />
          
          {filteredDeals.length === 0 ? (
            <div className="text-center py-8">
              {allDeals.length === 0 ? (
                <>
                  <p className="text-slate-600 mb-4">No deals found. Create your first deal to get started!</p>
                  <Button onClick={() => setShowDealForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Deal
                  </Button>
                </>
              ) : (
                <p className="text-slate-600">No deals match the current filters. Try adjusting your filter criteria.</p>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredDeals.map((deal) => (
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
