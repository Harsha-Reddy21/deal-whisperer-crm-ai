import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Brain, MessageSquare, Target, AlertCircle, RefreshCw } from 'lucide-react';
import { generateLeadPersona, CustomerPersona, isOpenAIConfigured } from '@/lib/openai';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CustomerPersonaBuilder = () => {
  const { user } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [persona, setPersona] = useState<CustomerPersona | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInteractionData, setHasInteractionData] = useState<boolean>(false);

  // Fetch leads instead of contacts
  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Check for interaction data when a lead is selected
  const { data: interactionData } = useQuery({
    queryKey: ['lead-interactions', selectedLeadId],
    queryFn: async () => {
      if (!selectedLeadId) return null;
      
      // Check for activities related to the lead directly by lead_id
      const { data: leadActivities, error: leadActivitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', selectedLeadId)
        .limit(10);

      if (leadActivitiesError) console.error('Error fetching lead activities:', leadActivitiesError);

      // Also check for activities related to the lead through converted contact
      const { data: contactActivities, error: contactActivitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', selectedLead?.converted_contact_id || '')
        .limit(10);

      if (contactActivitiesError) console.error('Error fetching contact activities:', contactActivitiesError);

      // Combine both activity sources
      const allActivities = [
        ...(leadActivities || []),
        ...(contactActivities || [])
      ];

      // Check for deals related to the lead
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .eq('contact_id', selectedLead?.converted_contact_id || '')
        .limit(5);

      if (dealsError) console.error('Error fetching deals:', dealsError);

      const hasData: boolean = Boolean(
        allActivities.length > 0 || 
        (deals && deals.length > 0)
      );

      setHasInteractionData(hasData);

      return {
        activities: allActivities,
        deals: deals || [],
        hasData
      };
    },
    enabled: !!selectedLeadId && !!selectedLead,
  });

  const generatePersona = async () => {
    if (!selectedLead) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Adapt lead data to work with the new lead persona generation function
      const adaptedLeadData = {
        name: selectedLead.name,
        company: selectedLead.company || '',
        email: selectedLead.email || '',
        phone: selectedLead.phone || '',
        status: selectedLead.status || 'new',
        source: selectedLead.source,
        score: selectedLead.score,
        activities: interactionData?.activities || [],
        deals: interactionData?.deals || []
      };

      const aiPersona = await generateLeadPersona(adaptedLeadData);
      setPersona(aiPersona);
    } catch (error) {
      console.error('Error generating persona:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate lead persona');
    } finally {
      setIsGenerating(false);
    }
  };

  const openAIConfigured = isOpenAIConfigured();

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-blue-600" />
            Lead Persona Builder
          </CardTitle>
          <CardDescription>
            AI auto-generates behavioral profiles for leads based on interaction history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Select Lead
              </label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a lead to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.company || 'No Company'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLead && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Lead Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-600">Name:</span> <span className="font-medium">{selectedLead.name}</span></div>
                  <div><span className="text-slate-600">Company:</span> <span className="font-medium">{selectedLead.company || 'Not specified'}</span></div>
                  <div><span className="text-slate-600">Email:</span> <span className="font-medium">{selectedLead.email || 'Not provided'}</span></div>
                  <div><span className="text-slate-600">Status:</span> <span className="font-medium">{selectedLead.status}</span></div>
                  <div><span className="text-slate-600">Source:</span> <span className="font-medium">{selectedLead.source}</span></div>
                  <div><span className="text-slate-600">Score:</span> <span className="font-medium">{selectedLead.score || 0}</span></div>
                </div>
                
                {/* Interaction Data Status */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center space-x-2">
                    {hasInteractionData ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-700 font-medium">Interaction data available</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-red-700 font-medium">No interaction data</span>
                      </>
                    )}
                  </div>
                  {interactionData && (
                    <div className="text-xs text-slate-600 mt-1">
                      Activities: {interactionData.activities.length} | Deals: {interactionData.deals.length}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button 
              onClick={generatePersona}
              disabled={!selectedLead || isGenerating || !openAIConfigured || !hasInteractionData}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Generating Persona...
                </>
              ) : !hasInteractionData && selectedLead ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Need Interaction Data
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate AI Persona
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
              <div className="text-red-700 text-sm">
                {error.includes('Insufficient lead information') ? (
                  <div>
                    <p className="font-medium mb-1">Insufficient lead information</p>
                    <p>This lead needs more basic information for persona generation. Please add:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Lead name (required)</li>
                      <li>At least one of: company, email, or phone</li>
                    </ul>
                  </div>
                ) : (
                  <p>{error}</p>
                )}
              </div>
            </div>
          )}

          {!hasInteractionData && selectedLead && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-blue-700 text-sm">
                <p className="font-medium mb-1">No interaction data found</p>
                <p>To generate an AI persona, this lead needs at least one activity or deal. Please add some interaction history first.</p>
              </div>
            </div>
          )}

          {persona && (
            <div className="space-y-6">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerPersonaBuilder; 