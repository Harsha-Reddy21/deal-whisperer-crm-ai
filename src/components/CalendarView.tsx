import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Plus, Clock, Users, Phone, Mail, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import ActivityForm from './ActivityForm';

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string;
  due_date: string;
  status: string;
  priority: string;
  contact_name?: string;
  deal_title?: string;
}

const CalendarView = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ['calendar-activities', user?.id, selectedDate],
    queryFn: async () => {
      if (!user) return [];
      
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);
      
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          contacts(name),
          deals(title)
        `)
        .eq('user_id', user.id)
        .gte('due_date', startDate.toISOString())
        .lte('due_date', endDate.toISOString())
        .order('due_date');

      if (error) throw error;

      return data.map(activity => ({
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        description: activity.description || '',
        due_date: activity.due_date,
        status: activity.status,
        priority: activity.priority,
        contact_name: activity.contacts?.name,
        deal_title: activity.deals?.title
      }));
    },
    enabled: !!user,
  });

  const getActivitiesForDate = (date: Date) => {
    return activities.filter(activity => 
      activity.due_date && isSameDay(parseISO(activity.due_date), date)
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'call': return Phone;
      case 'meeting': return Users;
      case 'note': return FileText;
      case 'task': return Clock;
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
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-orange-500';
      case 'low': return 'border-l-blue-500';
      default: return 'border-l-gray-500';
    }
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(selectedDate),
    end: endOfMonth(selectedDate)
  });

  const selectedDateActivities = getActivitiesForDate(selectedDate);

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="text-lg">Loading calendar...</div>
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
                <CalendarDays className="w-5 h-5 mr-2 text-blue-600" />
                Calendar & Scheduling
              </CardTitle>
              <CardDescription>
                View and manage your activities, meetings, and tasks
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowActivityForm(true)} 
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'month' | 'week' | 'day')}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>

            <TabsContent value="month" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="lg:col-span-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                  {/* Activity indicators */}
                  <div className="mt-2 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Has activities</span>
                    </div>
                  </div>
                </div>

                {/* Selected Date Activities */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </h3>
                  {selectedDateActivities.length === 0 ? (
                    <p className="text-slate-600 text-sm">No activities scheduled for this date.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateActivities.map((activity) => {
                        const IconComponent = getTypeIcon(activity.type);
                        return (
                          <Card 
                            key={activity.id} 
                            className={`border-l-4 ${getPriorityColor(activity.priority)} cursor-pointer hover:shadow-md transition-shadow`}
                            onClick={() => setSelectedActivity(activity)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start space-x-2">
                                <IconComponent className="w-4 h-4 text-slate-600 mt-1" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm text-slate-900 truncate">
                                    {activity.subject}
                                  </h4>
                                  {activity.contact_name && (
                                    <p className="text-xs text-slate-600">
                                      {activity.contact_name}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge className={`${getStatusColor(activity.status)} text-xs`}>
                                      {activity.status}
                                    </Badge>
                                    <span className="text-xs text-slate-500">
                                      {activity.due_date ? format(parseISO(activity.due_date), 'h:mm a') : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="week" className="space-y-6">
              <div className="text-center py-8">
                <p className="text-slate-600">Week view coming soon...</p>
              </div>
            </TabsContent>

            <TabsContent value="day" className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
                
                {/* Time slots */}
                <div className="space-y-2">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
                    const slotActivities = selectedDateActivities.filter(activity => {
                      if (!activity.due_date) return false;
                      const activityHour = parseISO(activity.due_date).getHours();
                      return activityHour === hour;
                    });

                    return (
                      <div key={hour} className="flex border-b border-slate-100 pb-2">
                        <div className="w-16 text-sm text-slate-600 font-medium">
                          {timeSlot}
                        </div>
                        <div className="flex-1 ml-4">
                          {slotActivities.map((activity) => {
                            const IconComponent = getTypeIcon(activity.type);
                            return (
                              <Card 
                                key={activity.id} 
                                className={`border-l-4 ${getPriorityColor(activity.priority)} mb-2 cursor-pointer hover:shadow-md transition-shadow`}
                                onClick={() => setSelectedActivity(activity)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-center space-x-2">
                                    <IconComponent className="w-4 h-4 text-slate-600" />
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm text-slate-900">
                                        {activity.subject}
                                      </h4>
                                      {activity.contact_name && (
                                        <p className="text-xs text-slate-600">
                                          {activity.contact_name}
                                        </p>
                                      )}
                                    </div>
                                    <Badge className={`${getStatusColor(activity.status)} text-xs`}>
                                      {activity.status}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Activity Form Dialog */}
      <ActivityForm 
        open={showActivityForm} 
        onOpenChange={setShowActivityForm} 
        onActivityCreated={refetch}
      />

      {/* Activity Details Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>
              View activity information
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-slate-900">{selectedActivity.subject}</h4>
                <p className="text-sm text-slate-600 mt-1">{selectedActivity.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Type:</span>
                  <span className="ml-2 font-medium">{selectedActivity.type}</span>
                </div>
                <div>
                  <span className="text-slate-600">Status:</span>
                  <Badge className={`ml-2 ${getStatusColor(selectedActivity.status)}`}>
                    {selectedActivity.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-600">Priority:</span>
                  <span className="ml-2 font-medium">{selectedActivity.priority}</span>
                </div>
                <div>
                  <span className="text-slate-600">Due:</span>
                  <span className="ml-2 font-medium">
                    {selectedActivity.due_date ? format(parseISO(selectedActivity.due_date), 'MMM d, h:mm a') : 'No due date'}
                  </span>
                </div>
              </div>

              {selectedActivity.contact_name && (
                <div>
                  <span className="text-slate-600">Contact:</span>
                  <span className="ml-2 font-medium">{selectedActivity.contact_name}</span>
                </div>
              )}

              {selectedActivity.deal_title && (
                <div>
                  <span className="text-slate-600">Deal:</span>
                  <span className="ml-2 font-medium">{selectedActivity.deal_title}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView; 