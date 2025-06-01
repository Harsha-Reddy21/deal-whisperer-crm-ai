import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MessageSquare, Phone, FileText, CheckSquare, Plus, Clock, Search, Filter, ArrowUpDown, SortAsc, SortDesc, Activity, AlertCircle, CheckCircle } from 'lucide-react';
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
  created_at: string;
}

type SortField = 'subject' | 'type' | 'status' | 'priority' | 'due_date' | 'created_at';
type SortDirection = 'asc' | 'desc';

const ActivitiesManager = () => {
  const { user } = useAuth();
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

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
        deal_title: activity.deals?.title,
        created_at: activity.created_at
      }));
    },
    enabled: !!user,
  });

  // Advanced search and filter algorithm
  const filteredAndSortedActivities = useMemo(() => {
    let filtered = activities;

    // Tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(activity => activity.status === activeTab);
    }

    // Search algorithm - searches across multiple fields with weighted relevance
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(activity => {
        const subjectMatch = activity.subject.toLowerCase().includes(searchLower);
        const descriptionMatch = activity.description.toLowerCase().includes(searchLower);
        const typeMatch = activity.type.toLowerCase().includes(searchLower);
        const contactMatch = activity.contact_name?.toLowerCase().includes(searchLower) || false;
        const dealMatch = activity.deal_title?.toLowerCase().includes(searchLower) || false;
        
        return subjectMatch || descriptionMatch || typeMatch || contactMatch || dealMatch;
      });

      // Sort by relevance when searching
      filtered.sort((a, b) => {
        const aSubject = a.subject.toLowerCase().includes(searchLower) ? 3 : 0;
        const aDescription = a.description.toLowerCase().includes(searchLower) ? 2 : 0;
        const aType = a.type.toLowerCase().includes(searchLower) ? 1 : 0;
        const aRelevance = aSubject + aDescription + aType;

        const bSubject = b.subject.toLowerCase().includes(searchLower) ? 3 : 0;
        const bDescription = b.description.toLowerCase().includes(searchLower) ? 2 : 0;
        const bType = b.type.toLowerCase().includes(searchLower) ? 1 : 0;
        const bRelevance = bSubject + bDescription + bType;

        return bRelevance - aRelevance;
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(activity => activity.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(activity => activity.priority === priorityFilter);
    }

    // Sorting algorithm
    if (!searchTerm.trim()) { // Only apply custom sorting when not searching
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
          case 'subject':
            aValue = a.subject.toLowerCase();
            bValue = b.subject.toLowerCase();
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'status':
            // Custom status ordering
            const statusOrder = { 'pending': 1, 'completed': 2, 'cancelled': 3 };
            aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
            bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
            break;
          case 'priority':
            // Custom priority ordering
            const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
            aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            break;
          case 'due_date':
            aValue = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
            bValue = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
            break;
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [activities, activeTab, searchTerm, typeFilter, statusFilter, priorityFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSortField('created_at');
    setSortDirection('desc');
  };

  // Calculate activity metrics
  const activityMetrics = useMemo(() => {
    const totalActivities = filteredAndSortedActivities.length;
    const pendingActivities = filteredAndSortedActivities.filter(activity => activity.status === 'pending').length;
    const completedActivities = filteredAndSortedActivities.filter(activity => activity.status === 'completed').length;
    const overdue = filteredAndSortedActivities.filter(activity => 
      activity.status === 'pending' && 
      activity.due_date && 
      new Date(activity.due_date) < new Date()
    ).length;
    
    return { totalActivities, pendingActivities, completedActivities, overdue };
  }, [filteredAndSortedActivities]);

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
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (!dueDate || status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

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
      {/* Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Activities</p>
                <p className="text-2xl font-bold text-slate-900">{activityMetrics.totalActivities}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-slate-900">{activityMetrics.pendingActivities}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-slate-900">{activityMetrics.completedActivities}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Overdue</p>
                <p className="text-2xl font-bold text-slate-900">{activityMetrics.overdue}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Activity Management
              </CardTitle>
              <CardDescription>
                Track and manage your sales activities and tasks
              </CardDescription>
            </div>
            <Button onClick={() => setShowActivityForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search activities by subject, description, type..." 
                  className="flex-1" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all') && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-2 text-sm">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Sort by:</span>
              {[
                { field: 'subject', label: 'Subject' },
                { field: 'type', label: 'Type' },
                { field: 'status', label: 'Status' },
                { field: 'priority', label: 'Priority' },
                { field: 'due_date', label: 'Due Date' },
                { field: 'created_at', label: 'Date Added' }
              ].map(({ field, label }) => (
                <Button
                  key={field}
                  variant={sortField === field ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleSort(field as SortField)}
                  className="h-8"
                >
                  {label}
                  {sortField === field && (
                    sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 bg-slate-100">
                <TabsTrigger value="all">All ({activities.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({activities.filter(a => a.status === 'pending').length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({activities.filter(a => a.status === 'completed').length})</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled ({activities.filter(a => a.status === 'cancelled').length})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {/* Results Summary */}
                <div className="text-sm text-slate-600 mb-4">
                  Showing {filteredAndSortedActivities.length} of {activities.length} activities
                  {searchTerm && ` matching "${searchTerm}"`}
                </div>

                {filteredAndSortedActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600 mb-4">
                      {activities.length === 0 ? "No activities found. Create your first activity to get started!" : "No activities match your search criteria."}
                    </p>
                    {activities.length === 0 ? (
                      <Button onClick={() => setShowActivityForm(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Activity
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAndSortedActivities.map((activity) => {
                      const IconComponent = getTypeIcon(activity.type);
                      const overdue = isOverdue(activity.due_date, activity.status);
                      
                      return (
                        <Card key={activity.id} className={`border transition-all duration-200 hover:shadow-md ${
                          overdue ? 'border-red-200 bg-red-50/50' : 'border-slate-200'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <IconComponent className={`w-5 h-5 mt-1 ${overdue ? 'text-red-600' : 'text-slate-600'}`} />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className={`font-semibold ${overdue ? 'text-red-900' : 'text-slate-900'}`}>
                                      {activity.subject}
                                    </h4>
                                    {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                                  </div>
                                  
                                  {activity.description && (
                                    <p className="text-sm text-slate-600 mb-2">{activity.description}</p>
                                  )}
                                  
                                  <div className="flex items-center space-x-4 text-sm text-slate-500">
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
                                <Badge className={getPriorityColor(activity.priority)}>
                                  {activity.priority}
                                </Badge>
                                <Badge className={getStatusColor(activity.status)}>
                                  {activity.status}
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
          </div>
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
