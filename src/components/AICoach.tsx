
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Clock, ThumbsUp, ThumbsDown, Calendar, History } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AICoachProps {
  selectedDeal: any;
}

const AICoach = ({ selectedDeal }: AICoachProps) => {
  const { toast } = useToast();
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{[key: string]: 'positive' | 'negative' | null}>({});

  const recommendations = [
    {
      id: 'follow-up',
      type: 'high',
      icon: AlertTriangle,
      title: 'Schedule Follow-up',
      description: 'It\'s been 3 days since last contact. Deals with gaps >48hrs have 32% lower close rates.',
      action: 'Send follow-up email',
      impact: '+15% close probability',
      timeline: '2 hours ago',
      completed: false
    },
    {
      id: 'value-prop',
      type: 'medium',
      icon: TrendingUp,
      title: 'Value Proposition',
      description: 'Similar deals succeed when ROI is clearly demonstrated. Consider sharing case study.',
      action: 'Send ROI calculator',
      impact: '+12% close probability',
      timeline: '1 day ago',
      completed: false
    },
    {
      id: 'next-steps',
      type: 'low',
      icon: CheckCircle,
      title: 'Next Steps',
      description: 'Deal is progressing well. Maintain momentum with clear next steps.',
      action: 'Schedule demo',
      impact: '+8% close probability',
      timeline: '3 days ago',
      completed: false
    }
  ];

  const toggleActionCompletion = (actionId: string) => {
    setCompletedActions(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
    
    toast({
      title: completedActions.includes(actionId) ? "Action marked as incomplete" : "Action completed!",
      description: "Progress updated successfully.",
    });
  };

  const handleFeedback = (actionId: string, feedbackType: 'positive' | 'negative') => {
    setFeedback(prev => ({ ...prev, [actionId]: feedbackType }));
    toast({
      title: "Feedback recorded",
      description: "Thank you for helping improve our AI suggestions!",
    });
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

  const completionRate = (completedActions.length / recommendations.length) * 100;

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
                <h3 className="font-semibold text-slate-900 mb-2">Analyzing Deal: {selectedDeal.title}</h3>
                <p className="text-slate-600 text-sm">Company: {selectedDeal.company}</p>
                <p className="text-slate-600 text-sm">Value: ${selectedDeal.value.toLocaleString()}</p>
                <p className="text-slate-600 text-sm">Current Probability: {selectedDeal.probability}%</p>
              </div>

              {/* Progress Tracker */}
              <Card className="border border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                      Progress Tracker
                    </h4>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {completedActions.length}/{recommendations.length} completed
                    </Badge>
                  </div>
                  <Progress value={completionRate} className="mb-2" />
                  <p className="text-sm text-slate-600">
                    {completionRate.toFixed(0)}% of AI recommendations completed
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  AI Recommendations
                </h4>
                
                {recommendations.map((rec, index) => (
                  <Card key={index} className={`border ${getRecommendationColor(rec.type)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <rec.icon className={`w-5 h-5 mt-0.5 ${getIconColor(rec.type)}`} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-slate-900 flex items-center">
                              {rec.title}
                              {completedActions.includes(rec.id) && (
                                <CheckCircle className="w-4 h-4 ml-2 text-green-600" />
                              )}
                            </h5>
                            <Badge variant="outline" className="text-xs">
                              {rec.impact}
                            </Badge>
                          </div>
                          
                          {/* Timeline Integration */}
                          <div className="flex items-center text-xs text-slate-500">
                            <History className="w-3 h-3 mr-1" />
                            AI suggested {rec.timeline}
                          </div>
                          
                          <p className="text-sm text-slate-600">{rec.description}</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                className="bg-gradient-to-r from-purple-600 to-blue-600"
                                onClick={() => toggleActionCompletion(rec.id)}
                                variant={completedActions.includes(rec.id) ? "outline" : "default"}
                              >
                                {completedActions.includes(rec.id) ? "Mark Incomplete" : rec.action}
                              </Button>
                            </div>
                            
                            {/* Feedback Rating */}
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-500">Helpful?</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`p-1 h-6 w-6 ${feedback[rec.id] === 'positive' ? 'bg-green-100 text-green-600' : ''}`}
                                onClick={() => handleFeedback(rec.id, 'positive')}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`p-1 h-6 w-6 ${feedback[rec.id] === 'negative' ? 'bg-red-100 text-red-600' : ''}`}
                                onClick={() => handleFeedback(rec.id, 'negative')}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

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
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Deal for AI Analysis</h3>
              <p className="text-slate-600">Click on any deal from the pipeline to get personalized AI recommendations.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AICoach;
