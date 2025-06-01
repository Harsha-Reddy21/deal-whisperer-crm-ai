import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, Check, X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: any;
}

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationCenter = ({ open, onOpenChange }: NotificationCenterProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // In a real implementation, this would come from a notifications table
  // For now, we'll simulate notifications based on activities and deals
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Simulate notifications based on recent activities and overdue tasks
      const [activitiesResult, dealsResult] = await Promise.all([
        supabase
          .from('activities')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .lt('due_date', new Date().toISOString())
          .order('due_date', { ascending: false })
          .limit(10),
        supabase
          .from('deals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const notifications: Notification[] = [];

      // Add overdue activity notifications
      if (activitiesResult.data) {
        activitiesResult.data.forEach(activity => {
          notifications.push({
            id: `activity-${activity.id}`,
            title: 'Overdue Activity',
            message: `"${activity.subject}" was due on ${new Date(activity.due_date).toLocaleDateString()}`,
            type: 'warning',
            read: false,
            created_at: activity.due_date,
            action_url: '/activities',
            metadata: { activityId: activity.id }
          });
        });
      }

      // Add new deal notifications
      if (dealsResult.data) {
        const recentDeals = dealsResult.data.filter(deal => {
          const createdAt = new Date(deal.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return createdAt > dayAgo;
        });

        recentDeals.forEach(deal => {
          notifications.push({
            id: `deal-${deal.id}`,
            title: 'New Deal Created',
            message: `Deal "${deal.title}" has been added to your pipeline`,
            type: 'success',
            read: false,
            created_at: deal.created_at,
            action_url: '/pipeline',
            metadata: { dealId: deal.id }
          });
        });
      }

      // Add some system notifications
      notifications.push({
        id: 'welcome',
        title: 'Welcome to SalesAI CRM',
        message: 'Your AI-powered sales assistant is ready to help you close more deals!',
        type: 'info',
        read: false,
        created_at: new Date().toISOString(),
        action_url: '/ai-coach'
      });

      return notifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user && open,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // In a real implementation, this would update the notification in the database
      // For now, we'll just simulate the action
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, this would mark all notifications as read
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "All notifications marked as read",
        description: "Your notification center has been cleared.",
      });
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertCircle;
      default: return Info;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <DialogTitle>Notifications</DialogTitle>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <DialogDescription>
            Stay updated with your latest activities and important alerts
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-600">Loading notifications...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No notifications</h3>
              <p className="text-slate-600">You're all caught up! Check back later for updates.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const IconComponent = getNotificationIcon(notification.type);
                return (
                  <Card 
                    key={notification.id} 
                    className={`border transition-all duration-200 hover:shadow-md ${
                      notification.read ? 'opacity-60' : ''
                    } ${getNotificationColor(notification.type)}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 text-sm">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-slate-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-500 mt-2">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                                className="ml-2 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {notification.action_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => {
                                // In a real app, this would navigate to the action URL
                                toast({
                                  title: "Navigation",
                                  description: `Would navigate to ${notification.action_url}`,
                                });
                                markAsReadMutation.mutate(notification.id);
                              }}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook for notification count (to be used in header)
export const useNotificationCount = () => {
  const { user } = useAuth();
  
  const { data: count = 0 } = useQuery({
    queryKey: ['notification-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      // Simulate getting unread count
      const [activitiesResult] = await Promise.all([
        supabase
          .from('activities')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .lt('due_date', new Date().toISOString())
      ]);

      return (activitiesResult.count || 0) + 1; // +1 for welcome message
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });

  return count;
};

export default NotificationCenter; 