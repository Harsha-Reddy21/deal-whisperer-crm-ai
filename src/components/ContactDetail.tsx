import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, Calendar, Building, MapPin, MessageSquare, Plus, Edit, Trash2, DollarSign, User, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import ActivityForm from './ActivityForm';

interface ContactDetailProps {
  contactId: string;
  onClose: () => void;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  deal_status: string;
  created_at: string;
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

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  status: string;
  last_contact: string;
  score: number;
  created_at: string;
  avatar?: string;
  company_id?: string;
  persona?: string;
  updated_at?: string;
  user_id?: string;
}

const ContactDetail = ({ contactId, onClose }: ContactDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showActivityForm, setShowActivityForm] = useState(false);

  // Fetch contact details
  const { data: contact, isLoading: isLoadingContact } = useQuery({
    queryKey: ['contact-detail', contactId],
    queryFn: async () => {
      if (!user || !contactId) return null;
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) {
        toast({
          title: "Error loading contact",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      return data as Contact;
    },
    enabled: !!user && !!contactId,
  });

  // Fetch deals for this contact
  const { data: deals = [], isLoading: isLoadingDeals } = useQuery({
    queryKey: ['contact-deals', contactId],
    queryFn: async () => {
      if (!user || !contactId) return [];
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading deals",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data.map(deal => ({
        id: deal.id,
        title: deal.title,
        value: Number(deal.value),
        stage: deal.stage,
        probability: deal.probability || 0,
        deal_status: deal.deal_status || deal.outcome || 'in_progress',
        created_at: deal.created_at
      }));
    },
    enabled: !!user && !!contactId,
  });

  // Fetch activities for this contact
  const { data: activities = [], isLoading: isLoadingActivities, refetch: refetchActivities } = useQuery({
    queryKey: ['contact-activities', contactId],
    queryFn: async () => {
      if (!user || !contactId) return [];
      
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', contactId)
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
    enabled: !!user && !!contactId,
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

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Discovery': return 'bg-blue-100 text-blue-800';
      case 'Proposal': return 'bg-yellow-100 text-yellow-800';
      case 'Negotiation': return 'bg-orange-100 text-orange-800';
      case 'Closing': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDealStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-100 text-green-800 border-green-200';
      case 'lost': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (isLoadingContact) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600">Loading contact details...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Contact not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contact Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xl">
              {contact.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{contact.name}</h2>
            <p className="text-slate-600">{contact.title || 'No title'} at {contact.company || 'No company'}</p>
            <div className="flex items-center mt-2 space-x-2">
              <Badge className={getStatusColor(contact.status)}>
                {contact.status}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                Score: {contact.score || 0}/100
              </Badge>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => setShowActivityForm(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Email:</span>
                  {contact.email || 'Not provided'}
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Phone:</span>
                  {contact.phone || 'Not provided'}
                </div>
                <div className="flex items-center">
                  <Building className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Company:</span>
                  {contact.company || 'Not provided'}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Address:</span>
                  {contact.address ? `${contact.address}, ${contact.city || ''} ${contact.state || ''} ${contact.country || ''}` : 'Not provided'}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Last Contact:</span>
                  {contact.last_contact ? new Date(contact.last_contact).toLocaleDateString() : 'Never'}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium mr-2">Created:</span>
                  {new Date(contact.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity & Deals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                  Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingDeals ? (
                  <div className="py-4 text-center">Loading deals...</div>
                ) : deals.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground">No deals found</div>
                ) : (
                  <div className="space-y-3">
                    {deals.slice(0, 3).map((deal) => (
                      <div key={deal.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{deal.title}</div>
                          <Badge className={getStageColor(deal.stage)}>
                            {deal.stage}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-slate-600 text-sm">${deal.value.toLocaleString()}</div>
                          <Badge className={getDealStatusColor(deal.deal_status)}>
                            {deal.deal_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {deals.length > 3 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full" 
                        onClick={() => setActiveTab('deals')}
                      >
                        View all {deals.length} deals
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deals</CardTitle>
              <CardDescription>All deals associated with {contact.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDeals ? (
                <div className="py-4 text-center">Loading deals...</div>
              ) : deals.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">No deals found for this contact</div>
              ) : (
                <div className="space-y-4">
                  {deals.map((deal) => (
                    <Card key={deal.id} className="border border-slate-200 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-slate-900">{deal.title}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStageColor(deal.stage)}>
                              {deal.stage}
                            </Badge>
                            <Badge className={getDealStatusColor(deal.deal_status)}>
                              {deal.deal_status}
                            </Badge>
                            <span className="text-lg font-bold text-slate-900">
                              ${deal.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <div>Created: {new Date(deal.created_at).toLocaleDateString()}</div>
                          {deal.deal_status === 'in_progress' && (
                            <div className="flex items-center">
                              <span>Probability: {deal.probability}%</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                <CardDescription>All activities with {contact.name}</CardDescription>
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
                <div className="py-4 text-center text-muted-foreground">No activities found for this contact</div>
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
        initialContactId={contactId}
      />
    </div>
  );
};

export default ContactDetail; 