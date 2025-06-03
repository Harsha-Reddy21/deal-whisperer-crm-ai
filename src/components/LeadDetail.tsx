import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, Calendar, Building, MapPin, MessageSquare, Plus, Target, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import ActivityForm from './ActivityForm';

interface LeadDetailProps {
  leadId: string;
  onClose: () => void;
}

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  title?: string;
  company: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  status: string;
  last_contact?: string;
  score: number;
  created_at: string;
  avatar?: string;
  company_id?: string;
  source?: string;
  updated_at?: string;
  user_id?: string;
  converted_contact_id?: string;
  assigned_to?: string;
}

const LeadDetail = ({ leadId, onClose }: LeadDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showActivityForm, setShowActivityForm] = useState(false);

  // Fetch lead details
  const { data: lead, isLoading: isLoadingLead } = useQuery({
    queryKey: ['lead-detail', leadId],
    queryFn: async () => {
      if (!user || !leadId) return null;
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) {
        toast({
          title: "Error loading lead",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      return data as Lead;
    },
    enabled: !!user && !!leadId,
  });

  // Fetch activities for this lead
  const { data: activities = [], isLoading: isLoadingActivities, refetch: refetchActivities } = useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: async () => {
      if (!user || !leadId) return [];
      
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading activities",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data.map(activity => ({
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        description: activity.description || '',
        status: activity.status,
        priority: activity.priority,
        due_date: activity.due_date || '',
        created_at: activity.created_at
      }));
    },
    enabled: !!user && !!leadId,
  });

  const handleActivityCreated = () => {
    refetchActivities();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot Lead': return 'bg-red-100 text-red-800';
      case 'Qualified': return 'bg-green-100 text-green-800';
      case 'Customer': return 'bg-blue-100 text-blue-800';
      case 'Cold Lead': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      case 'note': return 'bg-yellow-100 text-yellow-800';
      case 'task': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleGetFromLinkedIn = () => {
    // In a real implementation, this would trigger a LinkedIn data fetch
    toast({
      title: "LinkedIn Integration",
      description: "Fetching data from LinkedIn...",
    });
  };

  if (isLoadingLead) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600">Loading lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Lead not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lead Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl">
              {lead.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{lead.name}</h2>
            <p className="text-slate-600">{lead.title || 'No title'} at {lead.company || 'No company'}</p>
            <div className="flex items-center mt-2 space-x-2">
              <Badge className={getStatusColor(lead.status)}>
                {lead.status}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                Score: {lead.score || 0}/100
              </Badge>
              {lead.source && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Source: {lead.source}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="space-x-2">
          <Button 
            onClick={handleGetFromLinkedIn}
            variant="outline"
            className="bg-blue-50 text-blue-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Get from LinkedIn
          </Button>
          <Button 
            onClick={() => setShowActivityForm(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Email:</span>
                  {lead.email || 'Not provided'}
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Phone:</span>
                  {lead.phone || 'Not provided'}
                </div>
                <div className="flex items-center">
                  <Building className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Company:</span>
                  {lead.company || 'Not provided'}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Address:</span>
                  {lead.address ? `${lead.address}, ${lead.city || ''} ${lead.state || ''} ${lead.country || ''}` : 'Not provided'}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Last Contact:</span>
                  {lead.last_contact ? new Date(lead.last_contact).toLocaleDateString() : 'Never'}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Created:</span>
                  {new Date(lead.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingActivities ? (
                <div className="py-4 text-center">Loading activities...</div>
              ) : activities.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">No activities found</div>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 3).map((activity) => (
                    <div key={activity.id} className="p-3 border rounded-lg flex items-start">
                      <Badge className={getActivityTypeColor(activity.type)}>
                        {activity.type}
                      </Badge>
                      <div className="ml-3">
                        <div className="font-medium">{activity.subject}</div>
                        <div className="text-sm text-slate-500">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {activities.length > 3 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full" 
                      onClick={() => setActiveTab('activities')}
                    >
                      View all {activities.length} activities
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Activities</CardTitle>
                <CardDescription>All activities with {lead.name}</CardDescription>
              </div>
              <Button 
                onClick={() => setShowActivityForm(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Activity
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingActivities ? (
                <div className="py-4 text-center">Loading activities...</div>
              ) : activities.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">No activities found for this lead</div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="border border-slate-200 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Badge className={getActivityTypeColor(activity.type)}>
                            {activity.type}
                          </Badge>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{activity.subject}</h4>
                              <Badge className={activity.status === 'done' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                {activity.status}
                              </Badge>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                            )}
                            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                              <div>{new Date(activity.created_at).toLocaleString()}</div>
                              {activity.due_date && (
                                <div>Due: {new Date(activity.due_date).toLocaleDateString()}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activity Form */}
      <ActivityForm 
        open={showActivityForm}
        onOpenChange={setShowActivityForm}
        onActivityCreated={handleActivityCreated}
        initialLeadId={leadId}
      />
    </div>
  );
};

export default LeadDetail; 