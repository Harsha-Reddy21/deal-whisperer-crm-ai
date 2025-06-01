import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, TrendingUp, DollarSign, Target, MessageSquare, Calendar, LogOut, User } from 'lucide-react';
import DealsPipeline from '@/components/DealsPipeline';
import ContactsList from '@/components/ContactsList';
import AICoach from '@/components/AICoach';
import ObjectionHandler from '@/components/ObjectionHandler';
import ActivitiesManager from '@/components/ActivitiesManager';
import LeadManagement from '@/components/LeadManagement';
import ReportsDashboard from '@/components/ReportsDashboard';
import EmailTemplates from '@/components/EmailTemplates';
import CalendarScheduling from '@/components/CalendarScheduling';
import FileManagement from '@/components/FileManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [showTasksDialog, setShowTasksDialog] = useState(false);
  const [showAIAssistantDialog, setShowAIAssistantDialog] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  console.log('Index component rendered, user:', user);

  // Listen for AI Coach tab switch events
  useEffect(() => {
    const handleSwitchToAICoach = (event: any) => {
      console.log('Switching to AI Coach with deal:', event.detail);
      setActiveTab('ai-coach');
      setSelectedDeal(event.detail);
    };

    window.addEventListener('switchToAICoach', handleSwitchToAICoach);
    return () => window.removeEventListener('switchToAICoach', handleSwitchToAICoach);
  }, []);

  // Fetch real statistics from the database
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('No user found for stats query');
        return null;
      }

      console.log('Fetching stats for user:', user.id);

      try {
        const [contactsResult, dealsResult] = await Promise.all([
          supabase.from('contacts').select('id', { count: 'exact' }).eq('user_id', user.id),
          supabase.from('deals').select('id, value, stage', { count: 'exact' }).eq('user_id', user.id)
        ]);

        console.log('Contacts result:', contactsResult);
        console.log('Deals result:', dealsResult);

        if (contactsResult.error) {
          console.error('Error fetching contacts:', contactsResult.error);
        }
        
        if (dealsResult.error) {
          console.error('Error fetching deals:', dealsResult.error);
        }

        const totalContacts = contactsResult.count || 0;
        const totalDeals = dealsResult.count || 0;
        const deals = dealsResult.data || [];
        
        const totalRevenue = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
        const closedDeals = deals.filter(deal => deal.stage === 'Closing').length;
        const closeRate = totalDeals > 0 ? ((closedDeals / totalDeals) * 100).toFixed(1) : '0';

        const statsData = {
          totalContacts,
          totalDeals,
          totalRevenue,
          closeRate
        };

        console.log('Calculated stats:', statsData);
        return statsData;
      } catch (error) {
        console.error('Error in stats query:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    console.log('Signing out user');
    await signOut();
  };

  const handleTodaysTasks = () => {
    console.log('Opening tasks dialog');
    setShowTasksDialog(true);
  };

  const handleAIAssistant = () => {
    console.log('Opening AI assistant dialog');
    setShowAIAssistantDialog(true);
  };

  // Show loading state if user is not loaded yet
  if (!user) {
    console.log('No user found, showing loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading user data...</div>
      </div>
    );
  }

  const displayStats = [
    {
      title: "Total Contacts",
      value: statsLoading ? "..." : (stats?.totalContacts?.toString() || "0"),
      change: "+12%",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Deals",
      value: statsLoading ? "..." : (stats?.totalDeals?.toString() || "0"),
      change: "+8%",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Revenue Pipeline",
      value: statsLoading ? "..." : (stats?.totalRevenue ? `$${(stats.totalRevenue / 1000).toFixed(0)}K` : "$0"),
      change: "+23%",
      icon: DollarSign,
      color: "text-purple-600"
    },
    {
      title: "Close Rate",
      value: statsLoading ? "..." : `${stats?.closeRate || 0}%`,
      change: "+3.2%",
      icon: Target,
      color: "text-orange-600"
    }
  ];

  console.log('Rendering main content with stats:', displayStats);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">SalesAI CRM</h1>
                <p className="text-slate-600">AI-Powered Sales Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Live Pipeline
              </Badge>
              <div className="flex items-center space-x-2 px-3 py-2 bg-slate-100 rounded-lg">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-700">{user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleTodaysTasks}>
                <Calendar className="w-4 h-4 mr-2" />
                Today's Tasks
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={handleAIAssistant}>
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {displayStats.map((stat, index) => (
            <Card key={index} className="bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <p className={`text-xs ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-11 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="ai-coach">AI Coach</TabsTrigger>
            <TabsTrigger value="objection-handler">Objections</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="email-templates">Email</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <DealsPipeline onSelectDeal={setSelectedDeal} />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <ContactsList />
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            <LeadManagement />
          </TabsContent>

          <TabsContent value="activities" className="space-y-6">
            <ActivitiesManager />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsDashboard />
          </TabsContent>

          <TabsContent value="ai-coach" className="space-y-6">
            <AICoach selectedDeal={selectedDeal} />
          </TabsContent>

          <TabsContent value="objection-handler" className="space-y-6">
            <ObjectionHandler />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-purple-600" />
                  Win-Loss Analytics
                </CardTitle>
                <CardDescription>
                  AI-powered insights into why deals succeed or fail
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-900">Top Win Factors</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Quick Response Time</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={85} className="w-20" />
                            <span className="text-sm font-medium">85%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Demo Scheduling</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={72} className="w-20" />
                            <span className="text-sm font-medium">72%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Pricing Transparency</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={68} className="w-20" />
                            <span className="text-sm font-medium">68%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-900">Top Loss Factors</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Price Sensitivity</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={45} className="w-20" />
                            <span className="text-sm font-medium">45%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Competitor Choice</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={38} className="w-20" />
                            <span className="text-sm font-medium">38%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Poor Follow-up</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={32} className="w-20" />
                            <span className="text-sm font-medium">32%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email-templates" className="space-y-6">
            <EmailTemplates />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <CalendarScheduling />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <FileManagement />
          </TabsContent>
        </Tabs>
      </div>

      {/* Today's Tasks Dialog */}
      <Dialog open={showTasksDialog} onOpenChange={setShowTasksDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Today's Tasks</DialogTitle>
            <DialogDescription>
              Your scheduled tasks and follow-ups for today
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-slate-900">Follow up with Acme Corp</h4>
              <p className="text-sm text-slate-600">Discovery call scheduled for 2:00 PM</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-slate-900">Send proposal to TechFlow</h4>
              <p className="text-sm text-slate-600">Due today - $75K enterprise deal</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-slate-900">Contract review meeting</h4>
              <p className="text-sm text-slate-600">Final review with DataSync Inc at 4:30 PM</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assistant Dialog */}
      <Dialog open={showAIAssistantDialog} onOpenChange={setShowAIAssistantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Sales Assistant</DialogTitle>
            <DialogDescription>
              Get instant help with your sales process
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-slate-900">💡 Quick Insights</h4>
              <p className="text-sm text-slate-600">Your pipeline is 23% ahead of last month. Focus on closing 3 deals in negotiation stage.</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-slate-900">📧 Suggested Actions</h4>
              <p className="text-sm text-slate-600">Send follow-up emails to 2 prospects who haven't responded in 3+ days.</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-slate-900">🎯 Priority Recommendations</h4>
              <p className="text-sm text-slate-600">Schedule demos with your top 3 qualified leads to accelerate the sales cycle.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
