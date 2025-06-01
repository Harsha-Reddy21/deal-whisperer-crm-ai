import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, TrendingUp, CheckCircle, MessageSquare, Clock, Lightbulb, RefreshCw, Search, DollarSign, User, Calendar, Brain, Target, Activity, Mail, Phone, FileText, BarChart3, Zap, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { generateDealCoachRecommendations, DealCoachRecommendation, isOpenAIConfigured } from '@/lib/openai';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AICoachProps {
  selectedDeal: any;
  onSelectDeal?: (deal: any) => void;
}

interface DealContext {
  activities: any[];
  emails: any[];
  comments: any[];
  files: any[];
  contact: any;
  dealAge: number;
  lastActivityDays: number;
  stageHistory: any[];
}

interface AIRecommendation extends DealCoachRecommendation {
  id: string;
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'timing' | 'engagement' | 'process' | 'risk' | 'opportunity';
  applied: boolean;
  appliedAt?: string;
  feedback?: 'helpful' | 'not_helpful';
}

interface ActionTracker {
  id: string;
  recommendationId: string;
  action: string;
  appliedAt: string;
  outcome?: string;
  impactMeasured?: boolean;
}

const AICoach = ({ selectedDeal, onSelectDeal }: AICoachProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showDealDetails, setShowDealDetails] = useState(false);
  const [dealContext, setDealContext] = useState<DealContext | null>(null);
  const [activeTab, setActiveTab] = useState('recommendations');

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
        contact_id: deal.contact_id,
        last_activity: deal.last_activity ? new Date(deal.last_activity).toLocaleDateString() : 'No activity',
        next_step: deal.next_step || 'Follow up required',
        created_at: deal.created_at,
        updated_at: deal.updated_at
      }));
    },
    enabled: !!user,
  });

  // Fetch comprehensive deal context
  const fetchDealContext = async (dealId: string): Promise<DealContext> => {
    const [activitiesRes, emailsRes, commentsRes, filesRes, contactRes] = await Promise.all([
      supabase.from('activities').select('*').eq('deal_id', dealId).order('created_at', { ascending: false }),
      supabase.from('email_tracking').select('*').eq('deal_id', dealId).order('sent_at', { ascending: false }),
      supabase.from('comments').select('*').eq('deal_id', dealId).order('created_at', { ascending: false }),
      supabase.from('files').select('*').eq('deal_id', dealId).order('created_at', { ascending: false }),
      selectedDeal?.contact_id ? supabase.from('contacts').select('*').eq('id', selectedDeal.contact_id).single() : Promise.resolve({ data: null, error: null })
    ]);

    const dealAge = selectedDeal ? Math.floor((new Date().getTime() - new Date(selectedDeal.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const lastActivity = activitiesRes.data?.[0];
    const lastActivityDays = lastActivity ? Math.floor((new Date().getTime() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 999;

    return {
      activities: activitiesRes.data || [],
      emails: emailsRes.data || [],
      comments: commentsRes.data || [],
      files: filesRes.data || [],
      contact: contactRes.data,
      dealAge,
      lastActivityDays,
      stageHistory: [] // Would need additional tracking for stage changes
    };
  };

  // Enhanced AI analysis with pattern matching
  const generateEnhancedRecommendations = async (deal: any, context: DealContext): Promise<AIRecommendation[]> => {
    const baseRecommendations = isOpenAIConfigured() 
      ? await generateDealCoachRecommendations(deal, context)
      : getDefaultRecommendations(deal, context);

    // Add enhanced metadata and pattern matching
    return baseRecommendations.map((rec, index) => ({
      ...rec,
      id: `rec_${Date.now()}_${index}`,
      confidence: calculateConfidence(rec, deal, context),
      priority: determinePriority(rec, deal, context),
      category: categorizeRecommendation(rec),
      applied: false
    }));
  };

  const calculateConfidence = (rec: DealCoachRecommendation, deal: any, context: DealContext): number => {
    let confidence = 75; // Base confidence

    // Adjust based on data quality
    if (context.activities.length > 5) confidence += 10;
    if (context.emails.length > 3) confidence += 5;
    if (deal.probability > 0) confidence += 5;
    if (context.contact) confidence += 10;

    // Adjust based on deal characteristics
    if (deal.value > 50000) confidence += 5; // Higher value deals have more predictable patterns
    if (context.dealAge < 30) confidence += 5; // Newer deals have clearer patterns
    if (context.lastActivityDays < 3) confidence += 10; // Recent activity increases confidence

    return Math.min(95, Math.max(60, confidence));
  };

  const determinePriority = (rec: DealCoachRecommendation, deal: any, context: DealContext): 'critical' | 'high' | 'medium' | 'low' => {
    if (rec.type === 'high' && context.lastActivityDays > 7) return 'critical';
    if (rec.type === 'high') return 'high';
    if (rec.type === 'medium' && deal.probability > 70) return 'high';
    if (rec.type === 'medium') return 'medium';
    return 'low';
  };

  const categorizeRecommendation = (rec: DealCoachRecommendation): 'timing' | 'engagement' | 'process' | 'risk' | 'opportunity' => {
    const description = rec.description.toLowerCase();
    if (description.includes('follow') || description.includes('contact') || description.includes('days')) return 'timing';
    if (description.includes('engagement') || description.includes('response') || description.includes('silent')) return 'engagement';
    if (description.includes('stage') || description.includes('next step') || description.includes('process')) return 'process';
    if (description.includes('risk') || description.includes('stall') || description.includes('concern')) return 'risk';
    return 'opportunity';
  };

  const getDefaultRecommendations = (deal: any, context: DealContext): DealCoachRecommendation[] => {
    const recommendations: DealCoachRecommendation[] = [];

    // Timing-based recommendations
    if (context.lastActivityDays > 5) {
      recommendations.push({
        type: 'high',
        title: 'Urgent Follow-up Required',
        description: `${context.lastActivityDays} days since last activity. Deals with gaps >5 days have 40% lower close rates.`,
        action: 'Schedule immediate follow-up call or send re-engagement email',
        impact: `+${Math.min(25, context.lastActivityDays * 2)}% close probability`,
        reasoning: 'Consistent communication maintains momentum and prevents deals from going cold.'
      });
    }

    // Engagement-based recommendations
    if (context.emails.length === 0) {
      recommendations.push({
        type: 'medium',
        title: 'Establish Email Communication',
        description: 'No email communication tracked. Email engagement increases close rates by 23%.',
        action: 'Send personalized email with value proposition',
        impact: '+15% close probability',
        reasoning: 'Email creates a documented communication trail and allows for sharing detailed information.'
      });
    }

    // Value-based recommendations
    if (deal.value > 100000 && context.activities.filter(a => a.type === 'meeting').length < 2) {
      recommendations.push({
        type: 'high',
        title: 'Schedule Executive Meeting',
        description: 'High-value deals require executive involvement. Similar deals succeed with 2+ meetings.',
        action: 'Schedule meeting with decision makers',
        impact: '+20% close probability',
        reasoning: 'Executive meetings build trust and accelerate decision-making for large deals.'
      });
    }

    // Stage-specific recommendations
    if (deal.stage === 'Discovery' && context.dealAge > 14) {
      recommendations.push({
        type: 'medium',
        title: 'Advance Deal Stage',
        description: 'Deal has been in Discovery for 2+ weeks. Time to move to Proposal stage.',
        action: 'Present solution proposal and advance to next stage',
        impact: '+12% close probability',
        reasoning: 'Deals that advance stages regularly have higher close rates than those that stagnate.'
      });
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  };

  // Apply recommendation mutation
  const applyRecommendationMutation = useMutation({
    mutationFn: async ({ recommendationId, action }: { recommendationId: string; action: string }) => {
      // Track the action in database
      const { error } = await supabase
        .from('activities')
        .insert({
          user_id: user?.id,
          deal_id: selectedDeal?.id,
          type: 'ai_recommendation',
          subject: `AI Recommendation Applied: ${action}`,
          description: `Applied AI recommendation: ${action}`,
          status: 'completed'
        });

      if (error) throw error;

      // Update local state
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, applied: true, appliedAt: new Date().toISOString() }
            : rec
        )
      );

      return { recommendationId, action };
    },
    onSuccess: () => {
      toast({
        title: "Recommendation Applied",
        description: "Action has been tracked and recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error applying recommendation",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ recommendationId, feedback }: { recommendationId: string; feedback: 'helpful' | 'not_helpful' }) => {
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, feedback }
            : rec
        )
      );
      return { recommendationId, feedback };
    },
    onSuccess: () => {
      toast({
        title: "Feedback Recorded",
        description: "Thank you for your feedback. This helps improve our AI recommendations.",
      });
    }
  });

  // Filter deals based on search and stage
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.contact_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || deal.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  useEffect(() => {
    if (selectedDeal) {
      setIsAnalyzing(true);
      setError(null);
      
      fetchDealContext(selectedDeal.id)
        .then(context => {
          setDealContext(context);
          return generateEnhancedRecommendations(selectedDeal, context);
        })
        .then(recommendations => {
          setRecommendations(recommendations);
        })
        .catch(error => {
          console.error('Error analyzing deal:', error);
          setError(error.message);
        })
        .finally(() => {
          setIsAnalyzing(false);
        });
    }
  }, [selectedDeal]);

  const handleDealSelect = (deal: any) => {
    if (onSelectDeal) {
      onSelectDeal(deal);
    }
  };

  const getRecommendationColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getIconColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-700';
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'timing': return Clock;
      case 'engagement': return MessageSquare;
      case 'process': return Target;
      case 'risk': return AlertTriangle;
      case 'opportunity': return TrendingUp;
      default: return Lightbulb;
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'timing': return 'bg-blue-100 text-blue-800';
      case 'engagement': return 'bg-purple-100 text-purple-800';
      case 'process': return 'bg-indigo-100 text-indigo-800';
      case 'risk': return 'bg-red-100 text-red-800';
      case 'opportunity': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            Deal Coach AI
          </CardTitle>
          <CardDescription>
            AI-powered deal analysis with pattern matching and actionable recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDeal ? (
            <div className="space-y-6">
              {/* Deal Header */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{selectedDeal.title}</h3>
                    <p className="text-slate-600">{selectedDeal.company}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDealDetails(true)}
                      className="flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    {onSelectDeal && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectDeal(null)}
                      >
                        Change Deal
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">${selectedDeal.value.toLocaleString()}</div>
                    <div className="text-sm text-slate-600">Deal Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedDeal.probability}%</div>
                    <div className="text-sm text-slate-600">Probability</div>
                  </div>
                  <div className="text-center">
                    <Badge className={getStageColor(selectedDeal.stage)}>{selectedDeal.stage}</Badge>
                    <div className="text-sm text-slate-600 mt-1">Current Stage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{dealContext?.dealAge || 0}</div>
                    <div className="text-sm text-slate-600">Days Old</div>
                  </div>
                </div>
              </div>

              {/* Analysis Status */}
              {isAnalyzing && (
                <div className="flex items-center justify-center p-6 bg-blue-50 rounded-lg">
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin text-blue-600" />
                  <span className="text-blue-800">Analyzing deal patterns and generating recommendations...</span>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Main Content Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
                  <TabsTrigger value="context">Deal Context</TabsTrigger>
                  <TabsTrigger value="insights">Pattern Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="recommendations" className="space-y-4">
                  {recommendations.length > 0 ? (
                    <div className="space-y-4">
                      {recommendations.map((recommendation) => {
                        const Icon = getIcon(recommendation.category);
                        return (
                          <Card key={recommendation.id} className={`${getRecommendationColor(recommendation.priority)} transition-all hover:shadow-md`}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <Icon className={`w-5 h-5 ${getIconColor(recommendation.priority)}`} />
                                  <div>
                                    <h4 className="font-semibold text-slate-900">{recommendation.title}</h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Badge className={getPriorityBadgeColor(recommendation.priority)}>
                                        {recommendation.priority.toUpperCase()}
                                      </Badge>
                                      <Badge variant="outline" className={getCategoryBadgeColor(recommendation.category)}>
                                        {recommendation.category}
                                      </Badge>
                                      <div className="flex items-center text-sm text-slate-600">
                                        <BarChart3 className="w-3 h-3 mr-1" />
                                        {recommendation.confidence}% confidence
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {!recommendation.applied ? (
                                    <Button
                                      size="sm"
                                      onClick={() => applyRecommendationMutation.mutate({
                                        recommendationId: recommendation.id,
                                        action: recommendation.action
                                      })}
                                      disabled={applyRecommendationMutation.isPending}
                                      className="bg-gradient-to-r from-purple-600 to-blue-600"
                                    >
                                      <Zap className="w-3 h-3 mr-1" />
                                      Apply
                                    </Button>
                                  ) : (
                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                      Applied
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-slate-700 mb-3">{recommendation.description}</p>
                              
                              <div className="bg-white/50 p-3 rounded border-l-4 border-purple-400 mb-3">
                                <div className="font-medium text-slate-900 mb-1">Recommended Action:</div>
                                <p className="text-slate-700">{recommendation.action}</p>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="text-sm">
                                    <span className="font-medium text-green-600">{recommendation.impact}</span>
                                  </div>
                                  <div className="text-sm text-slate-600">
                                    <span className="font-medium">Why this works:</span> {recommendation.reasoning}
                                  </div>
                                </div>
                                
                                {recommendation.applied && !recommendation.feedback && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-slate-600">Was this helpful?</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => feedbackMutation.mutate({
                                        recommendationId: recommendation.id,
                                        feedback: 'helpful'
                                      })}
                                    >
                                      <ThumbsUp className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => feedbackMutation.mutate({
                                        recommendationId: recommendation.id,
                                        feedback: 'not_helpful'
                                      })}
                                    >
                                      <ThumbsDown className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-600">
                      <Brain className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                      <p>No recommendations available yet. AI is analyzing deal patterns...</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="context" className="space-y-4">
                  {dealContext && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-sm">
                            <Activity className="w-4 h-4 mr-2" />
                            Recent Activities ({dealContext.activities.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {dealContext.activities.slice(0, 5).map((activity, index) => (
                            <div key={index} className="flex items-center space-x-2 py-2 border-b last:border-b-0">
                              <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                              <span className="text-sm flex-1">{activity.subject}</span>
                              <span className="text-xs text-slate-500">
                                {new Date(activity.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                          {dealContext.activities.length === 0 && (
                            <p className="text-sm text-slate-500">No activities recorded</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-sm">
                            <Mail className="w-4 h-4 mr-2" />
                            Email Engagement ({dealContext.emails.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {dealContext.emails.slice(0, 5).map((email, index) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                              <span className="text-sm">{email.subject || 'Email sent'}</span>
                              <div className="flex items-center space-x-2">
                                {email.opened_at && <Badge variant="outline" className="text-xs bg-green-100">Opened</Badge>}
                                {email.clicked_at && <Badge variant="outline" className="text-xs bg-blue-100">Clicked</Badge>}
                                <span className="text-xs text-slate-500">
                                  {new Date(email.sent_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                          {dealContext.emails.length === 0 && (
                            <p className="text-sm text-slate-500">No email tracking data</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-sm">
                            <User className="w-4 h-4 mr-2" />
                            Contact Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {dealContext.contact ? (
                            <div className="space-y-2">
                              <div><span className="font-medium">Name:</span> {dealContext.contact.name}</div>
                              <div><span className="font-medium">Title:</span> {dealContext.contact.title || 'Not specified'}</div>
                              <div><span className="font-medium">Email:</span> {dealContext.contact.email || 'Not specified'}</div>
                              <div><span className="font-medium">Phone:</span> {dealContext.contact.phone || 'Not specified'}</div>
                              <div><span className="font-medium">Last Contact:</span> {dealContext.contact.last_contact ? new Date(dealContext.contact.last_contact).toLocaleDateString() : 'Never'}</div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No contact information available</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-sm">
                            <FileText className="w-4 h-4 mr-2" />
                            Files & Documents ({dealContext.files.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {dealContext.files.slice(0, 5).map((file, index) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                              <span className="text-sm">{file.filename}</span>
                              <span className="text-xs text-slate-500">
                                {new Date(file.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                          {dealContext.files.length === 0 && (
                            <p className="text-sm text-slate-500">No files attached</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  {dealContext && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Deal Health Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">
                              {Math.max(0, Math.min(100, selectedDeal.probability + (dealContext.activities.length * 5) - (dealContext.lastActivityDays * 2)))}
                            </div>
                            <div className="text-sm text-slate-600">Overall Health</div>
                            <Progress 
                              value={Math.max(0, Math.min(100, selectedDeal.probability + (dealContext.activities.length * 5) - (dealContext.lastActivityDays * 2)))} 
                              className="mt-2" 
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Engagement Level</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                              {dealContext.activities.length > 10 ? 'High' : dealContext.activities.length > 5 ? 'Medium' : 'Low'}
                            </div>
                            <div className="text-sm text-slate-600">{dealContext.activities.length} activities</div>
                            <div className="text-xs text-slate-500 mt-1">
                              Last activity: {dealContext.lastActivityDays} days ago
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Risk Assessment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <div className={`text-3xl font-bold ${dealContext.lastActivityDays > 7 ? 'text-red-600' : dealContext.lastActivityDays > 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {dealContext.lastActivityDays > 7 ? 'High' : dealContext.lastActivityDays > 3 ? 'Medium' : 'Low'}
                            </div>
                            <div className="text-sm text-slate-600">Risk Level</div>
                            <div className="text-xs text-slate-500 mt-1">
                              Based on activity patterns
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Deal Selection Interface */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search deals..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by stage" />
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

                <div className="grid gap-4">
                  {filteredDeals.map((deal) => (
                    <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleDealSelect(deal)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{deal.title}</h4>
                            <p className="text-sm text-slate-600">{deal.company}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="font-semibold text-green-600">${deal.value.toLocaleString()}</div>
                              <div className="text-sm text-slate-600">{deal.probability}% probability</div>
                            </div>
                            <Badge className={getStageColor(deal.stage)}>{deal.stage}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredDeals.length === 0 && (
                  <div className="text-center py-8 text-slate-600">
                    <Search className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p>No deals found matching your criteria.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deal Details Modal */}
      <Dialog open={showDealDetails} onOpenChange={setShowDealDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deal Details: {selectedDeal?.title}</DialogTitle>
            <DialogDescription>
              Comprehensive view of all deal-related data and communication history
            </DialogDescription>
          </DialogHeader>
          
          {selectedDeal && dealContext && (
            <div className="space-y-6">
              {/* Deal Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-sm text-slate-600">Value</div>
                  <div className="text-lg font-semibold text-green-600">${selectedDeal.value.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Probability</div>
                  <div className="text-lg font-semibold text-blue-600">{selectedDeal.probability}%</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Stage</div>
                  <Badge className={getStageColor(selectedDeal.stage)}>{selectedDeal.stage}</Badge>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Age</div>
                  <div className="text-lg font-semibold">{dealContext.dealAge} days</div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h4 className="font-semibold mb-3">Activity Timeline</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {dealContext.activities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded border">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{activity.subject}</span>
                          <span className="text-sm text-slate-500">{new Date(activity.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm text-slate-600">{activity.description}</div>
                        <Badge variant="outline" className="mt-1 text-xs">{activity.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Communication History */}
              <div>
                <h4 className="font-semibold mb-3">Communication History</h4>
                <div className="space-y-2">
                  {dealContext.emails.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{email.subject || 'Email sent'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {email.opened_at && <Badge variant="outline" className="text-xs bg-green-100">Opened</Badge>}
                        {email.clicked_at && <Badge variant="outline" className="text-xs bg-blue-100">Clicked</Badge>}
                        <span className="text-xs text-slate-500">{new Date(email.sent_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AICoach;
