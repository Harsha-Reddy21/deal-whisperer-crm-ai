import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus } from 'lucide-react';
import ActivityForm from './ActivityForm';

interface LeadActivitiesProps {
  leadId: string;
  userId: string;
  onAddActivity?: () => void;
}

const LeadActivities = ({ leadId, userId, onAddActivity }: LeadActivitiesProps) => {
  const { toast } = useToast();
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);

  const fetchActivities = async () => {
    if (!userId || !leadId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('id, type, subject, description, status, priority, due_date, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
        
      if (error) {
        toast({
          title: "Error loading activities",
          description: error.message,
          variant: "destructive",
        });
        setActivities([]);
      } else {
        setActivities(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch activities:", e);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchActivities();
  }, [leadId, userId]);
  
  const handleAddActivity = () => {
    setShowActivityForm(true);
  };
  
  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-purple-100 text-purple-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      case 'task': return 'bg-orange-100 text-orange-800';
      case 'note': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const onActivityCreated = () => {
    fetchActivities();
    if (onAddActivity) onAddActivity();
  };
  
  if (isLoading) {
    return <div className="text-center py-4">Loading activities...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-sm font-medium text-slate-600">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'} found
          </span>
        </div>
        <Button onClick={handleAddActivity} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-slate-500 mb-4">No activities found for this lead</div>
          <Button onClick={handleAddActivity} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add First Activity
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id} className="border border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Badge className={getActivityTypeColor(activity.type)}>
                    {activity.type}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{activity.subject}</h4>
                      <Badge className={activity.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {activity.status}
                      </Badge>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{activity.description}</p>
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
      
      <ActivityForm 
        open={showActivityForm}
        onOpenChange={setShowActivityForm}
        onActivityCreated={onActivityCreated}
        initialLeadId={leadId}
      />
    </div>
  );
};

export default LeadActivities; 