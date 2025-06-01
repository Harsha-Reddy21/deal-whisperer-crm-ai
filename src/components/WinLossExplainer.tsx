import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, TrendingDown, AlertCircle, RefreshCw, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { generateWinLossAnalysis, WinLossAnalysis, isOpenAIConfigured } from '@/lib/openai';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const WinLossExplainer = () => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<WinLossAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch deals data
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const defaultAnalysis: WinLossAnalysis = {
    outcome: 'won',
    primary_factors: [
      'Quick Response Time',
      'Clear Value Proposition',
      'Strong Relationship Building'
    ],
    contributing_factors: [
      'Competitive Pricing',
      'Product Demonstrations',
      'Customer References'
    ],
    lessons_learned: [
      'Deals close faster when demos are scheduled within 48 hours',
      'Price objections decrease when ROI is clearly demonstrated',
      'Follow-up frequency directly correlates with close rates'
    ],
    recommendations: [
      'Implement automated follow-up sequences',
      'Create ROI calculator for prospects',
      'Develop case study library for social proof'
    ],
    confidence_score: 75
  };

  useEffect(() => {
    if (deals.length > 0 && isOpenAIConfigured()) {
      generateAIAnalysis();
    } else if (deals.length > 0) {
      setAnalysis(defaultAnalysis);
    }
  }, [deals]);

  const generateAIAnalysis = async () => {
    if (deals.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const aiAnalysis = await generateWinLossAnalysis(deals);
      setAnalysis(aiAnalysis);
    } catch (error) {
      console.error('Error generating win/loss analysis:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate win/loss analysis');
      setAnalysis(defaultAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openAIConfigured = isOpenAIConfigured();

  // Calculate basic stats using the actual outcome field
  const wonDeals = deals.filter(deal => deal.outcome === 'won').length;
  const lostDeals = deals.filter(deal => deal.outcome === 'lost').length;
  const inProgressDeals = deals.filter(deal => deal.outcome === 'in_progress' || !deal.outcome).length;
  const totalDeals = deals.length;
  const winRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(1) : '0';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-lg">Loading deals data...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-purple-600" />
            Win-Loss Explainer
          </CardTitle>
          <CardDescription>
            AI explains why deals were won or lost based on data patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Won Deals</p>
                  <p className="text-2xl font-bold text-green-700">{wonDeals}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Lost Deals</p>
                  <p className="text-2xl font-bold text-red-700">{lostDeals}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700">{inProgressDeals}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Win Rate</p>
                  <p className="text-2xl font-bold text-purple-700">{winRate}%</p>
                </div>
                <Target className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* AI Analysis Controls */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              {openAIConfigured ? 'AI-Powered Analysis' : 'Default Analysis'}
            </h3>
            {openAIConfigured && deals.length > 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={generateAIAnalysis}
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
                    Refresh Analysis
                  </>
                )}
              </Button>
            )}
          </div>

          {!openAIConfigured && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-700 text-sm">
                <strong>Note:</strong> OpenAI API key not configured. Showing default analysis. 
                Add VITE_OPENAI_API_KEY to your .env file for AI-powered insights.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {deals.length === 0 && (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Deals Data</h3>
              <p className="text-slate-600">Add some deals to your pipeline to get AI-powered win/loss analysis.</p>
            </div>
          )}

          {analysis && deals.length > 0 && (
            <div className="space-y-6">
              {/* Confidence Score */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Analysis Confidence</span>
                  <span className="text-sm font-bold text-slate-900">{analysis.confidence_score}%</span>
                </div>
                <Progress value={analysis.confidence_score} className="h-2" />
              </div>

              {/* Primary Factors */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                    Primary Success Factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {analysis.primary_factors.map((factor, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{factor}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={85 - (index * 10)} className="w-20" />
                          <span className="text-sm font-medium">{85 - (index * 10)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Contributing Factors */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center">
                    <TrendingDown className="w-4 h-4 mr-2 text-orange-600" />
                    Contributing Factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {analysis.contributing_factors.map((factor, index) => (
                      <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Lessons Learned */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {analysis.lessons_learned.map((lesson, index) => (
                      <div key={index} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">{lesson}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="border border-slate-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center">
                    <Target className="w-4 h-4 mr-2 text-purple-600" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {analysis.recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-white/60 p-3 rounded-lg">
                        <p className="text-sm text-slate-700 font-medium">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WinLossExplainer; 