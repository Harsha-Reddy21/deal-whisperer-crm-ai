
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Lightbulb, Copy, ThumbsUp } from 'lucide-react';

const ObjectionHandler = () => {
  const [objection, setObjection] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const commonObjections = [
    {
      objection: "Your solution is too expensive compared to competitors",
      category: "Price",
      responses: [
        {
          approach: "Value-Based Response",
          text: "I understand price is important. Let's look at the total cost of ownership. Our solution typically pays for itself within 6 months through efficiency gains. Would you like to see a detailed ROI analysis based on your specific use case?",
          effectiveness: 85
        },
        {
          approach: "Social Proof",
          text: "I hear this concern often. TechCorp had the same concern initially, but after implementation, they saw a 300% ROI in the first year. They actually called us to expand to three more divisions. Can I share their case study with you?",
          effectiveness: 78
        }
      ]
    },
    {
      objection: "We need to think about it more",
      category: "Stalling",
      responses: [
        {
          approach: "Uncover Concerns",
          text: "Of course, this is an important decision. To help you think through this effectively, what specific aspects would you like to evaluate further? Is it the implementation timeline, budget approval, or technical fit?",
          effectiveness: 82
        },
        {
          approach: "Create Urgency",
          text: "I completely understand wanting to be thorough. Given that you mentioned the pain points are costing you $50K monthly, what would need to happen for you to feel confident moving forward this quarter?",
          effectiveness: 75
        }
      ]
    }
  ];

  const handleAnalyzeObjection = () => {
    if (!objection.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const mockSuggestions = [
        {
          approach: "Empathy + Value Reframe",
          text: `I completely understand your concern about ${objection.toLowerCase()}. Many of our best customers had similar hesitations initially. What they found was that the real question isn't whether to invest, but whether they can afford not to address this challenge. Can we explore what staying with the status quo might cost you over the next 12 months?`,
          effectiveness: 88,
          reasoning: "Acknowledges concern while reframing the conversation around cost of inaction"
        },
        {
          approach: "Question + Social Proof",
          text: `That's a valid point. Can you help me understand what specific aspect concerns you most? I ask because we had a similar conversation with DataCorp last month, and they discovered that the real issue was different than they initially thought. Would you be open to hearing how they approached this decision?`,
          effectiveness: 82,
          reasoning: "Uses questions to uncover deeper concerns while providing social validation"
        },
        {
          approach: "Agreement + Alternative",
          text: `You're absolutely right to bring that up. It's exactly the kind of thorough thinking that makes you a great partner. Given this concern, what if we explored a pilot program that addresses your specific worry while proving value? That way, you can see results before making a full commitment.`,
          effectiveness: 79,
          reasoning: "Validates their concern while offering a lower-risk path forward"
        }
      ];
      
      setSuggestions(mockSuggestions);
      setIsAnalyzing(false);
    }, 2000);
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-orange-600" />
            AI Objection Handler
          </CardTitle>
          <CardDescription>
            Paste any customer objection and get AI-generated response strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Customer Objection
              </label>
              <Textarea
                placeholder="Paste the customer's objection here..."
                value={objection}
                onChange={(e) => setObjection(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
            
            <Button 
              onClick={handleAnalyzeObjection}
              disabled={!objection.trim() || isAnalyzing}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Analyzing Objection...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Get AI Suggestions
                </>
              )}
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2" />
                AI-Generated Response Strategies
              </h4>
              
              {suggestions.map((suggestion, index) => (
                <Card key={index} className="border border-slate-200">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-slate-900">{suggestion.approach}</h5>
                        <Badge className={`${getEffectivenessColor(suggestion.effectiveness)} border-0`}>
                          {suggestion.effectiveness}% effective
                        </Badge>
                      </div>
                      
                      <p className="text-slate-700 text-sm leading-relaxed">
                        "{suggestion.text}"
                      </p>
                      
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                        <strong>Why this works:</strong> {suggestion.reasoning}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" className="text-xs">
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Response
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs">
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          Use This
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Common Objections & Responses</h4>
            
            {commonObjections.map((item, index) => (
              <Card key={index} className="border border-slate-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-slate-900">"{item.objection}"</h5>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {item.responses.map((response, responseIndex) => (
                        <div key={responseIndex} className="bg-slate-50 p-3 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">{response.approach}</span>
                            <Badge variant="outline" className="text-xs">
                              {response.effectiveness}% effective
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">"{response.text}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ObjectionHandler;
