import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Brain, MessageSquare, Target, AlertCircle, Search, Mail, Phone, Building2, Star } from 'lucide-react';
import { generateLeadPersona, CustomerPersona, isOpenAIConfigured, findPeopleForProduct, ProductPersonaMatch } from '@/lib/openai';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import EmailComposer from './EmailComposer';

const CustomerPersonaBuilder = () => {
  const { user } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [persona, setPersona] = useState<CustomerPersona | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInteractionData, setHasInteractionData] = useState<boolean>(false);
  
  // New state for product persona matching
  const [productQuery, setProductQuery] = useState<string>('');
  const [productMatches, setProductMatches] = useState<ProductPersonaMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Email composer state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [selectedPersonForEmail, setSelectedPersonForEmail] = useState<any>(null);

  // Fetch leads
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

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Check for interaction data when a lead is selected
  const { data: interactionData } = useQuery({
    queryKey: ['lead-interactions', selectedLeadId],
    queryFn: async () => {
      if (!selectedLeadId) return null;
      
      // Now we only check for activities related to the lead through converted contact
      const { data: contactActivities, error: contactActivitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', selectedLead?.converted_contact_id || '')
        .limit(10);

      if (contactActivitiesError) console.error('Error fetching contact activities:', contactActivitiesError);

      // No need to combine since we only have one source now
      const allActivities = contactActivities || [];

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
    enabled: !!selectedLeadId && !!selectedLead && !!selectedLead.converted_contact_id,
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

  const searchPeopleForProduct = async () => {
    if (!productQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    setProductMatches([]);
    
    try {
      const response = await findPeopleForProduct(productQuery, leads, contacts);
      setProductMatches(response.matches);
      
      if (response.matches.length === 0) {
        setSearchError(`No people found related to "${productQuery}". Try a different product or add more contacts/leads.`);
      }
    } catch (error) {
      console.error('Error searching people for product:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to find people for product');
    } finally {
      setIsSearching(false);
    }
  };

  const handleEmailClick = (person: any) => {
    setSelectedPersonForEmail(person);
    setEmailComposerOpen(true);
  };

  const handleCallClick = (phone: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

  const openAIConfigured = isOpenAIConfigured();

  const PersonaCard = ({ match }: { match: ProductPersonaMatch }) => (
    <Card className="border border-slate-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{match.person.name}</CardTitle>
              <CardDescription className="flex items-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span>{match.person.company}</span>
                {match.person.title && (
                  <>
                    <span>•</span>
                    <span>{match.person.title}</span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">{match.relevanceScore}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Why they're relevant:</h4>
          <p className="text-sm text-slate-600">{match.reasoning}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Match factors:</h4>
          <div className="flex flex-wrap gap-1">
            {match.matchFactors.map((factor, index) => (
              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                {factor}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex space-x-2 pt-2 border-t border-slate-100">
          <Button
            size="sm"
            onClick={() => handleEmailClick(match.person)}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
          {match.person.phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCallClick(match.person.phone)}
              className="flex-1"
            >
              <Phone className="w-4 h-4 mr-1" />
              Call
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-blue-600" />
            AI Persona Builder
          </CardTitle>
          <CardDescription>
            Generate behavioral profiles for leads or find people related to specific products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="lead-persona" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lead-persona">Lead Persona</TabsTrigger>
              <TabsTrigger value="product-persona">Get Persona</TabsTrigger>
            </TabsList>

            {/* Lead Persona Tab */}
            <TabsContent value="lead-persona" className="space-y-6">
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
                    
                    {/* Add Email and Call buttons for the generated persona */}
                    {selectedLead && (
                      <div className="flex space-x-2 mt-4 pt-4 border-t border-blue-200">
                        <Button
                          size="sm"
                          onClick={() => handleEmailClick(selectedLead)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Email {selectedLead.name}
                        </Button>
                        {selectedLead.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCallClick(selectedLead.phone)}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </Button>
                        )}
                      </div>
                    )}
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
            </TabsContent>

            {/* Product Persona Tab */}
            <TabsContent value="product-persona" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Product or Service
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="e.g., CRM software, marketing automation, cloud storage..."
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchPeopleForProduct()}
                    />
                    <Button 
                      onClick={searchPeopleForProduct}
                      disabled={!productQuery.trim() || isSearching || !openAIConfigured}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      {isSearching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Find People
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    AI will analyze your contacts and leads to find people most likely to be interested in this product
                  </p>
                </div>
              </div>

              {!openAIConfigured && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-yellow-700 text-sm">
                    OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file to enable AI persona matching.
                  </p>
                </div>
              )}

              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{searchError}</p>
                </div>
              )}

              {productMatches.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      People interested in "{productQuery}"
                    </h3>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {productMatches.length} matches found
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productMatches.map((match, index) => (
                      <PersonaCard key={index} match={match} />
                    ))}
                  </div>
                </div>
              )}

              {productQuery && !isSearching && productMatches.length === 0 && !searchError && (
                <div className="text-center py-8 text-slate-500">
                  <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>Enter a product name and click "Find People" to discover relevant contacts</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Email Composer */}
      <EmailComposer
        open={emailComposerOpen}
        onOpenChange={setEmailComposerOpen}
        prefilledTo={selectedPersonForEmail?.email || ''}
        prefilledSubject={`Regarding ${productQuery || 'our conversation'}`}
        contactId={selectedPersonForEmail?.type === 'contact' ? selectedPersonForEmail?.id : undefined}
      />
    </div>
  );
};

export default CustomerPersonaBuilder; 