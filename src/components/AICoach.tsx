import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, TrendingUp, CheckCircle, MessageSquare, Clock, Lightbulb, RefreshCw, Search, DollarSign, User, Calendar } from 'lucide-react';
import { generateDealCoachRecommendations, DealCoachRecommendation, isOpenAIConfigured } from '@/lib/openai';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AICoachProps {
  selectedDeal: any;
  onSelectDeal?: (deal: any) => void;
}

const AICoach = ({ selectedDeal, onSelectDeal }: AICoachProps) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<DealCoachRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  // Fetch deals for selection
  const { data: deals = [] } = useQuery({
    queryKey: ['deals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  // Filter deals based on search and stage
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.contact_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || deal.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const defaultRecommendations = [
    {
      type: 'high' as const,
      title: 'Schedule Follow-up',
      description: 'It\'s been 3 days since last contact. Deals with gaps >48hrs have 32% lower close rates.',
      action: 'Send follow-up email',
      impact: '+15% close probability',
      reasoning: 'Consistent communication maintains momentum and shows commitment to the prospect.'
    },
    {
      type: 'medium' as const,
      title: 'Value Proposition',
      description: 'Similar deals succeed when ROI is clearly demonstrated. Consider sharing case study.',
      action: 'Send ROI calculator',
      impact: '+12% close probability',
      reasoning: 'Quantified value propositions help prospects justify the purchase internally.'
    },
    {
      type: 'low' as const,
      title: 'Next Steps',
      description: 'Deal is progressing well. Maintain momentum with clear next steps.',
      action: 'Schedule demo',
      impact: '+8% close probability',
      reasoning: 'Clear next steps prevent deals from stalling and maintain forward momentum.'
    }
  ];

  useEffect(() => {
    console.log('🧠 AICoach: useEffect triggered');
    console.log('🧠 AICoach: selectedDeal:', selectedDeal);
    console.log('🧠 AICoach: isOpenAIConfigured:', isOpenAIConfigured());
    
    if (selectedDeal && isOpenAIConfigured()) {
      console.log('🧠 AICoach: Generating AI recommendations for deal:', selectedDeal.title);
      generateAIRecommendations();
    } else if (selectedDeal) {
      console.log('🧠 AICoach: Using default recommendations for deal:', selectedDeal.title);
      setRecommendations(defaultRecommendations);
    } else {
      console.log('🧠 AICoach: No selected deal');
    }
  }, [selectedDeal]);

  const generateAIRecommendations = async () => {
    if (!selectedDeal) {
      console.log('🧠 AICoach: generateAIRecommendations called but no selectedDeal');
      return;
    }
    
    console.log('🧠 AICoach: Starting AI analysis for deal:', selectedDeal.title);
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log('🧠 AICoach: Calling generateDealCoachRecommendations API');
      const aiRecommendations = await generateDealCoachRecommendations(selectedDeal);
      console.log('🧠 AICoach: Received AI recommendations:', aiRecommendations);
      setRecommendations(aiRecommendations);
    } catch (error) {
      console.error('🧠 AICoach: Error getting AI recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate AI recommendations');
      console.log('🧠 AICoach: Falling back to default recommendations');
      setRecommendations(defaultRecommendations);
    } finally {
      console.log('🧠 AICoach: AI analysis completed');
      setIsAnalyzing(false);
    }
  };

  const handleDealSelect = (deal: any) => {
    console.log('🧠 AICoach: Deal selected:', deal.title);
    if (onSelectDeal) {
      onSelectDeal(deal);
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'high': return AlertTriangle;
      case 'medium': return TrendingUp;
      case 'low': return CheckCircle;
      default: return CheckCircle;
    }
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

  const openAIConfigured = isOpenAIConfigured();

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
            AI Deal Coach
          </CardTitle>
          <CardDescription>
            Get AI-powered recommendations to improve your deal success rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDeal ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">Analyzing Deal: {selectedDeal.title}</h3>
                  <div className="flex items-center space-x-2">
                    {onSelectDeal && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => onSelectDeal(null)}
                      >
                        Select Different Deal
                      </Button>
                    )}
                    {openAIConfigured && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={generateAIRecommendations}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-600 border-t-transparent mr-1"></div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Refresh AI Analysis
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-slate-600 text-sm">Company: {selectedDeal.company}</p>
                <p className="text-slate-600 text-sm">Value: ${selectedDeal.value.toLocaleString()}</p>
                <p className="text-slate-600 text-sm">Current Probability: {selectedDeal.probability}%</p>
              </div>

              {!openAIConfigured && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-700 text-sm">
                    <strong>Note:</strong> OpenAI API key not configured. Showing default recommendations. 
                    Add VITE_OPENAI_API_KEY to your .env file for AI-powered analysis.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {openAIConfigured ? 'AI-Powered Recommendations' : 'Default Recommendations'}
                </h4>
                
                {recommendations.map((recommendation, index) => {
                  const Icon = getIcon(recommendation.type);
                  return (
                    <Card key={index} className={`${getRecommendationColor(recommendation.type)} border`}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Icon className={`w-5 h-5 mt-0.5 ${getIconColor(recommendation.type)}`} />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-slate-900">{recommendation.title}</h5>
                              <Badge variant="outline" className="text-xs">
                                {recommendation.impact}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700">{recommendation.description}</p>
                            <div className="bg-white/60 p-2 rounded text-xs text-slate-600">
                              <strong>Action:</strong> {recommendation.action}
                            </div>
                            {recommendation.reasoning && (
                              <div className="bg-white/60 p-2 rounded text-xs text-slate-600">
                                <strong>Why this works:</strong> {recommendation.reasoning}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Deal Timeline Analysis
                </h4>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Average cycle time:</span>
                      <span className="ml-2 font-medium">45 days</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Days in current stage:</span>
                      <span className="ml-2 font-medium">12 days</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Predicted close date:</span>
                      <span className="ml-2 font-medium">March 15, 2024</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Risk level:</span>
                      <Badge className="ml-2 bg-green-100 text-green-800">Low</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-6">
                <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Deal for AI Analysis</h3>
                <p className="text-slate-600">Choose a deal from your pipeline to get personalized AI recommendations.</p>
              </div>

              {/* Deal Selection Interface */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center space-x-2 flex-1">
                    <Search className="w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search deals by title, company, or contact..." 
                      className="flex-1" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      <SelectItem value="Discovery">Discovery</SelectItem>
                      <SelectItem value="Proposal">Proposal</SelectItem>
                      <SelectItem value="Negotiation">Negotiation</SelectItem>
                      <SelectItem value="Closing">Closing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-slate-600">
                  Showing {filteredDeals.length} of {deals.length} deals
                </div>

                {filteredDeals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">
                      {deals.length === 0 ? "No deals found. Create your first deal to get AI coaching!" : "No deals match your search criteria."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 max-h-96 overflow-y-auto">
                    {filteredDeals.map((deal) => (
                      <Card 
                        key={deal.id} 
                        className="border border-slate-200 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300"
                        onClick={() => handleDealSelect(deal)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-slate-900">{deal.title}</h4>
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
                                  <span className="text-sm font-medium text-purple-600">
                                    {deal.probability}%
                                  </span>
                                  <Progress value={deal.probability} className="w-16" />
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="hover:bg-purple-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDealSelect(deal);
                                  }}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Get AI Coaching
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AICoach;
