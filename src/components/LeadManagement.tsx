
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search, Plus, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LeadForm from './LeadForm';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  score: number;
  status: string;
  created_at: string;
}

const LeadManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeadForm, setShowLeadForm] = useState(false);

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['leads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading leads",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data.map(lead => ({
        id: lead.id,
        name: lead.name,
        company: lead.company || '',
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || 'manual',
        score: lead.score || 0,
        status: lead.status || 'new',
        created_at: new Date(lead.created_at).toLocaleDateString()
      }));
    },
    enabled: !!user,
  });

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'unqualified': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const convertToContact = async (lead: Lead) => {
    try {
      // Create contact from lead
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          user_id: user?.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          status: 'Qualified',
          score: lead.score
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Update lead status to converted
      const { error: leadError } = await supabase
        .from('leads')
        .update({ 
          status: 'converted',
          converted_contact_id: contact.id
        })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      toast({
        title: "Lead converted!",
        description: `${lead.name} has been converted to a contact.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error converting lead",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="text-lg">Loading leads...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Lead Management
              </CardTitle>
              <CardDescription>
                Capture, score, and qualify your sales leads
              </CardDescription>
            </div>
            <Button onClick={() => setShowLeadForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search leads..." 
                className="flex-1" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredLeads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  {leads.length === 0 ? "No leads found. Create your first lead to get started!" : "No leads match your search."}
                </p>
                {leads.length === 0 && (
                  <Button onClick={() => setShowLeadForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Lead
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredLeads.map((lead) => (
                  <Card key={lead.id} className="border border-slate-200 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-900">{lead.name}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(lead.status)}>
                                {lead.status}
                              </Badge>
                              <span className={`text-sm font-medium ${getScoreColor(lead.score)}`}>
                                Score: {lead.score}/100
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-3">
                            <div>Company: {lead.company || 'N/A'}</div>
                            <div>Email: {lead.email || 'N/A'}</div>
                            <div>Phone: {lead.phone || 'N/A'}</div>
                            <div>Source: {lead.source}</div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">
                              Created: {lead.created_at}
                            </span>
                            <div className="flex space-x-2">
                              {lead.status !== 'converted' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => convertToContact(lead)}
                                  className="hover:bg-green-50"
                                >
                                  <Users className="w-4 h-4 mr-1" />
                                  Convert to Contact
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <LeadForm 
        open={showLeadForm} 
        onOpenChange={setShowLeadForm} 
        onLeadCreated={refetch}
      />
    </div>
  );
};

export default LeadManagement;
