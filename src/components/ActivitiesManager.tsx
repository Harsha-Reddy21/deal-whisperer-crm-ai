
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MessageSquare, Phone, FileText, CheckSquare, Plus, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ActivityForm from './ActivityForm';

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  contact_name?: string;
  deal_title?: string;
}

const ActivitiesManager = () => {
  const { user } = useAuth();
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ['activities', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          contacts(name),
          deals(title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(activity => ({
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        description: activity.description || '',
        status: activity.status,
        priority: activity.priority,
        due_date: activity.due_date ? new Date(activity.due_date).toLocaleDateString() : '',
        contact_name: activity.contacts?.name,
        deal_title: activity.deals?.title
      }));
    },
    enabled: !!user,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return MessageSquare;
      case 'call': return Phone;
      case 'meeting': return Calendar;
      case 'note': return FileText;
      case 'task': return CheckSquare;
      default: return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return activity.status === 'pending';
    if (activeTab === 'completed') return activity.status === 'completed';
    return activity.type === activeTab;
  });

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="text-lg">Loading activities...</div>
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
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Activity & Task Management
              </CardTitle>
              <CardDescription>
                Track customer interactions, tasks, and follow-ups
              </CardDescription>
            </div>
            <Button onClick={() => setShowActivityForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="call">Calls</TabsTrigger>
              <TabsTrigger value="meeting">Meetings</TabsTrigger>
              <TabsTrigger value="task">Tasks</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-4">No activities found.</p>
                  <Button onClick={() => setShowActivityForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Activity
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => {
                    const IconComponent = getTypeIcon(activity.type);
                    return (
                      <Card key={activity.id} className="border border-slate-200 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <IconComponent className="w-5 h-5 text-slate-600 mt-1" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900">{activity.subject}</h4>
                                {activity.description && (
                                  <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                                )}
                                <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                                  {activity.contact_name && (
                                    <span>Contact: {activity.contact_name}</span>
                                  )}
                                  {activity.deal_title && (
                                    <span>Deal: {activity.deal_title}</span>
                                  )}
                                  {activity.due_date && (
                                    <span>Due: {activity.due_date}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(activity.status)}>
                                {activity.status}
                              </Badge>
                              <Badge className={getPriorityColor(activity.priority)}>
                                {activity.priority}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ActivityForm 
        open={showActivityForm} 
        onOpenChange={setShowActivityForm} 
        onActivityCreated={refetch}
      />
    </div>
  );
};

export default ActivitiesManager;
