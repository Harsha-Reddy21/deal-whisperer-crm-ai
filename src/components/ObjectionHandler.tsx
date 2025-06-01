import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Lightbulb, Copy, ThumbsUp, Check, AlertCircle } from 'lucide-react';
import { generateObjectionSuggestions, ObjectionSuggestion } from '@/lib/openai';

const ObjectionHandler = () => {
  const [objection, setObjection] = useState('');
  const [suggestions, setSuggestions] = useState<ObjectionSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeObjection = async () => {
    if (!objection.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const aiSuggestions = await generateObjectionSuggestions(objection);
      setSuggestions(aiSuggestions);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setError('Failed to generate AI suggestions. Please try again or check your internet connection.');
      setSuggestions([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  const handleCopyResponse = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleUseResponse = (suggestion: ObjectionSuggestion) => {
    // You can implement this to integrate with your CRM or other systems
    console.log('Using suggestion:', suggestion);
    // For now, we'll just copy it to clipboard
    handleCopyResponse(suggestion.text, -1);
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

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
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleCopyResponse(suggestion.text, index)}
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Response
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleUseResponse(suggestion)}
                        >
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ObjectionHandler;
