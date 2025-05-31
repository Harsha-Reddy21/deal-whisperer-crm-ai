
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface AICoachProps {
  selectedDeal: any;
}

const AICoach = ({ selectedDeal }: AICoachProps) => {
  const recommendations = [
    {
      type: 'high',
      icon: AlertTriangle,
      title: 'Schedule Follow-up',
      description: 'It\'s been 3 days since last contact. Deals with gaps >48hrs have 32% lower close rates.',
      action: 'Send follow-up email',
      impact: '+15% close probability'
    },
    {
      type: 'medium',
      icon: TrendingUp,
      title: 'Value Proposition',
      description: 'Similar deals succeed when ROI is clearly demonstrated. Consider sharing case study.',
      action: 'Send ROI calculator',
      impact: '+12% close probability'
    },
    {
      type: 'low',
      icon: CheckCircle,
      title: 'Next Steps',
      description: 'Deal is progressing well. Maintain momentum with clear next steps.',
      action: 'Schedule demo',
      impact: '+8% close probability'
    }
  ];

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
                            <h5 className="font-medium text-slate-900">{rec.title}</h5>
                            <Badge variant="outline" className="text-xs">
                              {rec.impact}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{rec.description}</p>
                          <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                            {rec.action}
                          </Button>
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
