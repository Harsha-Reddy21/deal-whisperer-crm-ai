import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, CheckCircle, AlertCircle, Phone, Mail, MessageSquare, FileText, Plus, Search, Filter, ArrowUpDown, SortAsc, SortDesc, Edit, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import ActivityForm from './ActivityForm';

interface Activity {
  id: string;
  subject: string;
  type: string;
  description: string;
  priority: string;
  status: string;
  due_date: string;
  created_at: string;
  contact_name?: string;
}

type SortField = 'subject' | 'type' | 'priority' | 'status' | 'due_date' | 'created_at' | 'contact';
type SortDirection = 'asc' | 'desc';

const ActivitiesManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Edit form state
  const [editForm, setEditForm] = useState({
    subject: '',
    type: 'call',
    description: '',
    priority: 'medium',
    status: 'pending',
    due_date: ''
  });

  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ['activities', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          contacts(name)
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

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
        subject: activity.subject,
        type: activity.type || 'call',
        description: activity.description || '',
        priority: activity.priority || 'medium',
        status: activity.status || 'pending',
        due_date: activity.due_date || '',
        created_at: activity.created_at,
        contact_name: activity.contacts?.name
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
        const priorityMatch = activity.priority.toLowerCase().includes(searchLower);
        const statusMatch = activity.status.toLowerCase().includes(searchLower);
        const contactMatch = activity.contact_name?.toLowerCase().includes(searchLower);
        
        return subjectMatch || descriptionMatch || typeMatch || priorityMatch || statusMatch || contactMatch;
      });

      // Sort by relevance when searching
      filtered.sort((a, b) => {
        const aSubject = a.subject.toLowerCase().includes(searchLower) ? 3 : 0;
        const aDescription = a.description.toLowerCase().includes(searchLower) ? 2 : 0;
        const aType = a.type.toLowerCase().includes(searchLower) ? 1 : 0;
        const aContact = a.contact_name?.toLowerCase().includes(searchLower) ? 2 : 0;
        const aRelevance = aSubject + aDescription + aType + aContact;

        const bSubject = b.subject.toLowerCase().includes(searchLower) ? 3 : 0;
        const bDescription = b.description.toLowerCase().includes(searchLower) ? 2 : 0;
        const bType = b.type.toLowerCase().includes(searchLower) ? 1 : 0;
        const bContact = b.contact_name?.toLowerCase().includes(searchLower) ? 2 : 0;
        const bRelevance = bSubject + bDescription + bType + bContact;

        return bRelevance - aRelevance;
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === typeFilter);
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
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case 'priority':
            const priorityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'urgent': 4 };
            aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            break;
          case 'status':
            const statusOrder = { 'completed': 1, 'pending': 2, 'cancelled': 3 };
            aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
            bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
            break;
          case 'contact':
            aValue = a.contact_name?.toLowerCase() || '';
            bValue = b.contact_name?.toLowerCase() || '';
            break;
          case 'due_date':
            aValue = a.due_date ? new Date(a.due_date) : new Date(0);
            bValue = b.due_date ? new Date(b.due_date) : new Date(0);
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
  }, [activities, activeTab, searchTerm, typeFilter, priorityFilter, sortField, sortDirection]);

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
    setPriorityFilter('all');
    setSortField('due_date');
    setSortDirection('asc');
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setEditForm({
      subject: activity.subject,
      type: activity.type,
      description: activity.description,
      priority: activity.priority,
      status: activity.status,
      due_date: activity.due_date
    });
  };

  const handleSaveEdit = async () => {
    if (!editingActivity || !user) return;

    if (!editForm.subject.trim()) {
      toast({
        title: "Error",
        description: "Subject is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('activities')
        .update({
          subject: editForm.subject.trim(),
          type: editForm.type,
          description: editForm.description.trim(),
          priority: editForm.priority,
          status: editForm.status,
          due_date: editForm.due_date || null
        })
        .eq('id', editingActivity.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Activity updated",
        description: "Activity has been successfully updated.",
      });

      setEditingActivity(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error updating activity",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingActivity || !user) return;

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', deletingActivity.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Activity deleted",
        description: "Activity has been successfully deleted.",
      });

      setDeletingActivity(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error deleting activity",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markAsCompleted = async (activity: Activity) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('activities')
        .update({ status: 'completed' })
        .eq('id', activity.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Activity completed!",
        description: "Activity has been marked as completed.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error updating activity",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Calendar;
      case 'note': return FileText;
      case 'task': return CheckCircle;
      default: return MessageSquare;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      case 'note': return 'bg-yellow-100 text-yellow-800';
      case 'task': return 'bg-orange-100 text-orange-800';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  // Calculate activity metrics
  const totalActivities = activities.length;
  const pendingActivities = activities.filter(activity => activity.status === 'pending').length;
  const completedActivities = activities.filter(activity => activity.status === 'completed').length;
  const overdueActivities = activities.filter(activity => 
    activity.status === 'pending' && isOverdue(activity.due_date)
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-lg">Loading activities...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Activities</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalActivities}</div>
            <p className="text-xs text-slate-600">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{pendingActivities}</div>
            <p className="text-xs text-slate-600">Need attention</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{completedActivities}</div>
            <p className="text-xs text-slate-600">Finished tasks</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{overdueActivities}</div>
            <p className="text-xs text-slate-600">Past due date</p>
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
                Track calls, emails, meetings, and tasks
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
            {/* Activity Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({totalActivities})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingActivities})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedActivities})</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex items-center space-x-2 flex-1">
                    <Search className="w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search activities by subject, description, contact..." 
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

                    {(searchTerm || typeFilter !== 'all' || priorityFilter !== 'all') && (
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
                    { field: 'priority', label: 'Priority' },
                    { field: 'status', label: 'Status' },
                    { field: 'due_date', label: 'Due Date' },
                    { field: 'created_at', label: 'Created' },
                    { field: 'contact', label: 'Contact' }
                  ].map(({ field, label }) => (
                    <Button
                      key={field}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(field as SortField)}
                      className={`h-8 ${sortField === field ? "text-blue-600" : ""}`}
                    >
                      {label}
                      {sortField === field && (
                        sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                      )}
                    </Button>
                  ))}
                </div>

                {/* Results Summary */}
                <div className="text-sm text-slate-600">
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
                  <div className="grid gap-4">
                    {filteredAndSortedActivities.map((activity) => {
                      const TypeIcon = getTypeIcon(activity.type);
                      const overdue = isOverdue(activity.due_date);
                      
                      return (
                        <Card 
                          key={activity.id} 
                          className={`border transition-all duration-200 hover:shadow-md ${
                            overdue ? 'border-red-200 bg-red-50' : 'border-slate-200'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <TypeIcon className="w-5 h-5 mt-1 text-slate-600" />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-900">{activity.subject}</h3>
                                    <div className="flex items-center space-x-2">
                                      <Badge className={getTypeColor(activity.type)}>
                                        {activity.type}
                                      </Badge>
                                      <Badge className={getPriorityColor(activity.priority)}>
                                        {activity.priority}
                                      </Badge>
                                      <Badge className={getStatusColor(activity.status)}>
                                        {activity.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  {activity.description && (
                                    <p className="text-sm text-slate-600">{activity.description}</p>
                                  )}

                                  {/* Contact Information */}
                                  {(activity.contact_name) && (
                                    <div className="flex items-center space-x-1 text-sm text-slate-600">
                                      <User className="w-4 h-4" />
                                      <span>
                                        {activity.contact_name}
                                        {activity.contact_name && ' (Contact)'}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                                      {activity.due_date && (
                                        <div className={`flex items-center ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                          <Clock className="w-4 h-4 mr-1" />
                                          Due: {new Date(activity.due_date).toLocaleDateString()}
                                          {overdue && ' (Overdue)'}
                                        </div>
                                      )}
                                      <div className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        Created: {new Date(activity.created_at).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {activity.status === 'pending' && (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={() => markAsCompleted(activity)}
                                          className="hover:bg-green-50 text-green-600"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Complete
                                        </Button>
                                      )}
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleEdit(activity)}
                                        className="hover:bg-blue-50"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => setDeletingActivity(activity)}
                                        className="hover:bg-red-50 text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
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

      {/* Edit Activity Dialog */}
      <Dialog open={!!editingActivity} onOpenChange={() => setEditingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>
              Update activity information. Subject is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject *</label>
              <Input
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                placeholder="Activity subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Activity description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={editForm.priority} onValueChange={(value) => setEditForm({ ...editForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingActivity(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingActivity} onOpenChange={() => setDeletingActivity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingActivity?.subject}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ActivityForm 
        open={showActivityForm} 
        onOpenChange={setShowActivityForm} 
        onActivityCreated={refetch}
      />
    </div>
  );
};

export default ActivitiesManager;
