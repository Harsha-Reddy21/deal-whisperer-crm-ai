import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { User, Brain, MessageSquare, Target, AlertCircle, RefreshCw, Database, TrendingUp, Clock, Users } from 'lucide-react';
import { generateCustomerPersona, generateRAGCustomerPersona, CustomerPersona, isOpenAIConfigured } from '@/lib/openai';
import { ragPersonaService, InteractionHistory, BehavioralMetrics } from '@/lib/ragPersonaService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CustomerPersonaBuilder = () => {
  const { user } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [persona, setPersona] = useState<CustomerPersona | null>(null);
  const [interactionHistory, setInteractionHistory] = useState<InteractionHistory | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationMethod, setGenerationMethod] = useState<'basic' | 'rag'>('rag');

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  const analyzeInteractionHistory = async () => {
    if (!selectedContact || !user) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const history = await ragPersonaService.gatherInteractionHistory(selectedContact.id, user.id);
      setInteractionHistory(history);
    } catch (error) {
      console.error('Error analyzing interaction history:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze interaction history');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generatePersona = async () => {
    if (!selectedContact || !user) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      let aiPersona: CustomerPersona;
      
      if (generationMethod === 'rag' && interactionHistory) {
        // Use RAG-enhanced generation
        const personaContext = await ragPersonaService.generatePersonaContext(selectedContact.id, user.id);
        const ragPrompt = ragPersonaService.createRAGPrompt(personaContext);
        aiPersona = await generateRAGCustomerPersona(ragPrompt);
        
        // Store the generated persona in the database
        await supabase.from('customer_personas').upsert({
          user_id: user.id,
          contact_id: selectedContact.id,
          persona_name: aiPersona.name,
          role: aiPersona.role,
          company_size: aiPersona.company_size,
          industry: aiPersona.industry,
          communication_style: aiPersona.communication_style,
          decision_making_style: aiPersona.decision_making_style,
          pain_points: aiPersona.pain_points,
          preferred_channels: aiPersona.preferred_channels,
          buying_motivations: aiPersona.buying_motivations,
          objections_likely: aiPersona.objections_likely,
          recommended_approach: aiPersona.recommended_approach,
          behavioral_metrics: interactionHistory.behavioralMetrics,
          interaction_summary: {
            totalInteractions: interactionHistory.behavioralMetrics.totalInteractions,
            emailEngagementRate: interactionHistory.behavioralMetrics.emailEngagementRate,
            communicationFrequency: interactionHistory.behavioralMetrics.communicationFrequency
          }
        });
        
        // Track generation history
        await supabase.from('persona_generation_history').insert({
          user_id: user.id,
          contact_id: selectedContact.id,
          generation_method: 'rag_enhanced',
          interaction_count: interactionHistory.behavioralMetrics.totalInteractions,
          input_data_quality: Math.min(100, Math.max(20, interactionHistory.behavioralMetrics.totalInteractions * 10)),
          data_sources: {
            activities: interactionHistory.activities.length,
            emails: interactionHistory.emails.length,
            deals: interactionHistory.deals.length,
            comments: interactionHistory.comments.length,
            files: interactionHistory.files.length
          }
        });
      } else {
        // Use basic generation
        aiPersona = await generateCustomerPersona(selectedContact);
        
        // Track generation history
        await supabase.from('persona_generation_history').insert({
          user_id: user.id,
          contact_id: selectedContact.id,
          generation_method: 'basic',
          interaction_count: 0,
          input_data_quality: 30,
          data_sources: { basic_contact_info: true }
        });
      }
      
      setPersona(aiPersona);
    } catch (error) {
      console.error('Error generating persona:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate customer persona');
    } finally {
      setIsGenerating(false);
    }
  };

  const openAIConfigured = isOpenAIConfigured();

  const getDataQualityScore = (metrics: BehavioralMetrics): number => {
    const interactionScore = Math.min(50, metrics.totalInteractions * 2);
    const emailScore = metrics.emailEngagementRate > 0 ? 20 : 0;
    const dealScore = metrics.dealProgression.conversionRate > 0 ? 20 : 0;
    const patternScore = metrics.interactionPatterns.preferredChannels.length > 0 ? 10 : 0;
    
    return interactionScore + emailScore + dealScore + patternScore;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-blue-600" />
            Customer Persona Builder
          </CardTitle>
          <CardDescription>
            AI auto-generates behavioral profiles for leads based on comprehensive interaction history using RAG technology
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Select Contact
              </label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a contact to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} - {contact.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedContact && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Contact Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-600">Name:</span> <span className="font-medium">{selectedContact.name}</span></div>
                  <div><span className="text-slate-600">Company:</span> <span className="font-medium">{selectedContact.company}</span></div>
                  <div><span className="text-slate-600">Email:</span> <span className="font-medium">{selectedContact.email}</span></div>
                  <div><span className="text-slate-600">Status:</span> <span className="font-medium">{selectedContact.status}</span></div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Generation Method
                </label>
                <Select value={generationMethod} onValueChange={(value: 'basic' | 'rag') => setGenerationMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (Contact Info Only)</SelectItem>
                    <SelectItem value="rag">RAG Enhanced (Full Interaction History)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {generationMethod === 'rag' && selectedContact && (
                <Button 
                  onClick={analyzeInteractionHistory}
                  disabled={isAnalyzing}
                  variant="outline"
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-transparent mr-2"></div>
                      Analyzing Interaction History...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Analyze Interaction History
                    </>
                  )}
                </Button>
              )}
            </div>

            <Button 
              onClick={generatePersona}
              disabled={!selectedContact || isGenerating || !openAIConfigured || (generationMethod === 'rag' && !interactionHistory)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Generating Persona...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate {generationMethod === 'rag' ? 'RAG-Enhanced' : 'Basic'} Persona
                </>
              )}
            </Button>
          </div>

          {!openAIConfigured && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-yellow-700 text-sm">
                OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file to enable AI persona generation.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {interactionHistory && (
            <Card className="border border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                  Interaction Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-lg text-blue-600">{interactionHistory.behavioralMetrics.totalInteractions}</div>
                      <div className="text-slate-600">Total Interactions</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-lg text-green-600">{interactionHistory.behavioralMetrics.emailEngagementRate.toFixed(1)}%</div>
                      <div className="text-slate-600">Email Engagement</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-lg text-purple-600">{interactionHistory.behavioralMetrics.responseTimeAvg}h</div>
                      <div className="text-slate-600">Avg Response Time</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-lg text-orange-600">{interactionHistory.behavioralMetrics.dealProgression.conversionRate}%</div>
                      <div className="text-slate-600">Conversion Rate</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Data Quality Score</span>
                      <span>{getDataQualityScore(interactionHistory.behavioralMetrics)}%</span>
                    </div>
                    <Progress value={getDataQualityScore(interactionHistory.behavioralMetrics)} className="h-2" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="font-medium text-slate-700 mb-1">Communication Style</div>
                      <Badge variant="outline" className="text-xs">{interactionHistory.behavioralMetrics.communicationFrequency}</Badge>
                    </div>
                    <div>
                      <div className="font-medium text-slate-700 mb-1">Decision Speed</div>
                      <Badge variant="outline" className="text-xs">{interactionHistory.behavioralMetrics.decisionMakingSpeed}</Badge>
                    </div>
                    <div>
                      <div className="font-medium text-slate-700 mb-1">Preferred Channels</div>
                      <div className="flex flex-wrap gap-1">
                        {interactionHistory.behavioralMetrics.interactionPatterns.preferredChannels.slice(0, 2).map((channel, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{channel}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {persona && (
            <Tabs defaultValue="persona" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="persona">Generated Persona</TabsTrigger>
                <TabsTrigger value="insights">Behavioral Insights</TabsTrigger>
              </TabsList>
              
              <TabsContent value="persona" className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-slate-900 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {persona.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Role:</span>
                      <span className="ml-2 font-medium">{persona.role}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Company Size:</span>
                      <span className="ml-2 font-medium">{persona.company_size}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Industry:</span>
                      <span className="ml-2 font-medium">{persona.industry}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Communication Style:</span>
                      <span className="ml-2 font-medium">{persona.communication_style}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <Target className="w-4 h-4 mr-2 text-red-600" />
                        Pain Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {persona.pain_points.map((point, index) => (
                          <Badge key={index} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {point}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-blue-600" />
                        Preferred Channels
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {persona.preferred_channels.map((channel, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <Brain className="w-4 h-4 mr-2 text-green-600" />
                        Buying Motivations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {persona.buying_motivations.map((motivation, index) => (
                          <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {motivation}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
                        Likely Objections
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {persona.objections_likely.map((objection, index) => (
                          <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {objection}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recommended Approach</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-700">{persona.recommended_approach}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
                {interactionHistory && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-blue-600" />
                          Activity Patterns
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div>
                          <div className="text-xs text-slate-600 mb-1">Most Active Hours</div>
                          <div className="flex flex-wrap gap-1">
                            {interactionHistory.behavioralMetrics.interactionPatterns.mostActiveHours.map((hour, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{hour}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-600 mb-1">Most Active Days</div>
                          <div className="flex flex-wrap gap-1">
                            {interactionHistory.behavioralMetrics.interactionPatterns.mostActiveDays.map((day, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{day}</Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center">
                          <Users className="w-4 h-4 mr-2 text-green-600" />
                          Engagement Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-slate-600">Meetings</div>
                            <div className="font-semibold">{interactionHistory.behavioralMetrics.contentEngagement.meetingsScheduled}</div>
                          </div>
                          <div>
                            <div className="text-slate-600">Calls</div>
                            <div className="font-semibold">{interactionHistory.behavioralMetrics.contentEngagement.callsCompleted}</div>
                          </div>
                          <div>
                            <div className="text-slate-600">Documents</div>
                            <div className="font-semibold">{interactionHistory.behavioralMetrics.contentEngagement.documentsShared}</div>
                          </div>
                          <div>
                            <div className="text-slate-600">Deal Cycle</div>
                            <div className="font-semibold">{interactionHistory.behavioralMetrics.dealProgression.averageDealCycle}d</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerPersonaBuilder; 