import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Brain, MessageSquare, Target, AlertCircle, RefreshCw } from 'lucide-react';
import { generateCustomerPersona, CustomerPersona, isOpenAIConfigured } from '@/lib/openai';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CustomerPersonaBuilder = () => {
  const { user } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [persona, setPersona] = useState<CustomerPersona | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const generatePersona = async () => {
    if (!selectedContact) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const aiPersona = await generateCustomerPersona(selectedContact);
      setPersona(aiPersona);
    } catch (error) {
      console.error('Error generating persona:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate customer persona');
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
            Customer Persona Builder
          </CardTitle>
          <CardDescription>
            AI auto-generates behavioral profiles for leads based on interaction history
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

            <Button 
              onClick={generatePersona}
              disabled={!selectedContact || isGenerating || !openAIConfigured}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Generating Persona...
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
              <p className="text-red-700 text-sm">{error}</p>
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