import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, TrendingUp, DollarSign, Target, MessageSquare, Calendar, LogOut, User, Brain, Building2 } from 'lucide-react';
import DealsPipeline from '@/components/DealsPipeline';
import ContactsList from '@/components/ContactsList';
import AICoach from '@/components/AICoach';
import AIAssistant from '@/components/AIAssistant';
import ObjectionHandler from '@/components/ObjectionHandler';
import CustomerPersonaBuilder from '@/components/CustomerPersonaBuilder';
import WinLossExplainer from '@/components/WinLossExplainer';
import ActivitiesManager from '@/components/ActivitiesManager';
import LeadManagement from '@/components/LeadManagement';
import CompaniesManager from '@/components/CompaniesManager';
import ReportsDashboard from '@/components/ReportsDashboard';
import EmailManager from '@/components/EmailManager';
import CalendarScheduling from '@/components/CalendarScheduling';
import FileManagement from '@/components/FileManagement';
import TranscriptsManager from '@/components/TranscriptsManager';
import ChatCRM from '@/components/ChatCRM';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [activeTab, setActiveTab] = useState('deals');
  const [showChatCRM, setShowChatCRM] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  console.log('Index component rendered, user:', user);

  // Listen for AI Coach tab switch events
  useEffect(() => {
    const handleSwitchToAICoach = (event: any) => {
      console.log('🎯 Index: Received switchToAICoach event');
      console.log('🎯 Index: Event detail (deal):', event.detail);
      console.log('🎯 Index: Switching to AI Coach with deal:', event.detail?.title);
      console.log('🎯 Index: Current activeTab before switch:', activeTab);
      
      // Set the selected deal first, then switch to AI Coach tab
      setSelectedDeal(event.detail);
      setActiveTab('ai-coach');
      
      console.log('🎯 Index: Tab switched to ai-coach');
      console.log('🎯 Index: Selected deal set to:', event.detail?.title);
    };

    console.log('🎯 Index: Adding switchToAICoach event listener');
    window.addEventListener('switchToAICoach', handleSwitchToAICoach);
    return () => {
      console.log('🎯 Index: Removing switchToAICoach event listener');
      window.removeEventListener('switchToAICoach', handleSwitchToAICoach);
    };
  }, []); // Remove activeTab from dependency array to prevent re-registration

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
        const [contactsResult, dealsResult, companiesResult] = await Promise.all([
          supabase.from('contacts').select('id', { count: 'exact' }).eq('user_id', user.id),
          supabase.from('deals').select('id, value, stage', { count: 'exact' }).eq('user_id', user.id),
          supabase.from('companies').select('id', { count: 'exact' }).eq('user_id', user.id)
        ]);

        console.log('Contacts result:', contactsResult);
        console.log('Deals result:', dealsResult);
        console.log('Companies result:', companiesResult);

        if (contactsResult.error) {
          console.error('Error fetching contacts:', contactsResult.error);
        }
        
        if (dealsResult.error) {
          console.error('Error fetching deals:', dealsResult.error);
        }

        if (companiesResult.error) {
          console.error('Error fetching companies:', companiesResult.error);
        }

        const totalContacts = contactsResult.count || 0;
        const totalDeals = dealsResult.count || 0;
        const totalCompanies = companiesResult.count || 0;
        const deals = dealsResult.data || [];
        
        const totalRevenue = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
        const closedDeals = deals.filter(deal => deal.stage === 'Closing').length;
        const closeRate = totalDeals > 0 ? ((closedDeals / totalDeals) * 100).toFixed(1) : '0';

        const statsData = {
          totalContacts,
          totalDeals,
          totalCompanies,
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

  const handleChatCRM = () => {
    console.log('Opening ChatCRM dialog');
    setShowChatCRM(true);
  };

  const handleAIAssistant = () => {
    console.log('Switching to AI Assistant tab');
    setActiveTab('ai-assistant');
  };

  // Test function to debug the event system
  const testAICoachEvent = () => {
    console.log('🧪 Testing AI Coach event system');
    const testDeal = {
      id: 'test-123',
      title: 'Test Deal',
      company: 'Test Company',
      value: 50000,
      stage: 'Discovery',
      probability: 75,
      contact_name: 'Test Contact',
      last_activity: 'Today',
      next_step: 'Follow up',
      created_at: new Date().toISOString()
    };
    
    const event = new CustomEvent('switchToAICoach', { 
      detail: testDeal 
    });
    console.log('🧪 Dispatching test event:', event);
    window.dispatchEvent(event);
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
      title: "Total Companies",
      value: statsLoading ? "..." : (stats?.totalCompanies?.toString() || "0"),
      change: "+15%",
      icon: Building2,
      color: "text-indigo-600"
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
                Live Deals
              </Badge>
              <div className="flex items-center space-x-2 px-3 py-2 bg-slate-100 rounded-lg">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-700">{user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleChatCRM}>
                <MessageSquare className="w-4 h-4 mr-2" />
                ChatCRM
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={handleAIAssistant}>
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              <Button variant="outline" size="sm" onClick={testAICoachEvent} className="bg-yellow-50 border-yellow-300">
                🧪 Test AI Coach
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
          <div className="overflow-x-auto">
            <TabsList className="flex w-max bg-white/60 backdrop-blur-sm p-1 rounded-lg">
              <TabsTrigger value="deals" className="whitespace-nowrap">Deals</TabsTrigger>
              <TabsTrigger value="contacts" className="whitespace-nowrap">Contacts</TabsTrigger>
              <TabsTrigger value="leads" className="whitespace-nowrap">Leads</TabsTrigger>
              <TabsTrigger value="activities" className="whitespace-nowrap">Activities</TabsTrigger>
              <TabsTrigger value="reports" className="whitespace-nowrap">Reports</TabsTrigger>
              <TabsTrigger value="ai-assistant" className="whitespace-nowrap">AI Assistant</TabsTrigger>
              <TabsTrigger value="ai-coach" className="whitespace-nowrap">AI Coach</TabsTrigger>
              <TabsTrigger value="objection-handler" className="whitespace-nowrap">Objections</TabsTrigger>
              <TabsTrigger value="persona-builder" className="whitespace-nowrap">Personas</TabsTrigger>
              <TabsTrigger value="win-loss" className="whitespace-nowrap">Win-Loss</TabsTrigger>
              <TabsTrigger value="compose-email" className="whitespace-nowrap">Emails</TabsTrigger>
              <TabsTrigger value="calendar" className="whitespace-nowrap">Calendar</TabsTrigger>
              <TabsTrigger value="files" className="whitespace-nowrap">Files</TabsTrigger>
              <TabsTrigger value="companies" className="whitespace-nowrap">Companies</TabsTrigger>
              <TabsTrigger value="transcripts" className="whitespace-nowrap">Transcripts</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="deals" className="space-y-6">
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

          <TabsContent value="ai-assistant" className="space-y-6">
            <AIAssistant />
          </TabsContent>

          <TabsContent value="ai-coach" className="space-y-6">
            <AICoach selectedDeal={selectedDeal} onSelectDeal={setSelectedDeal} />
          </TabsContent>

          <TabsContent value="objection-handler" className="space-y-6">
            <ObjectionHandler />
          </TabsContent>

          <TabsContent value="persona-builder" className="space-y-6">
            <CustomerPersonaBuilder />
          </TabsContent>

          <TabsContent value="win-loss" className="space-y-6">
            <WinLossExplainer />
          </TabsContent>

          <TabsContent value="compose-email" className="space-y-6">
            <EmailManager />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <CalendarScheduling />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <FileManagement />
          </TabsContent>

          <TabsContent value="companies" className="space-y-6">
            <CompaniesManager />
          </TabsContent>

          <TabsContent value="transcripts" className="space-y-6">
            <TranscriptsManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* ChatCRM Dialog */}
      <ChatCRM open={showChatCRM} onOpenChange={setShowChatCRM} initialMessage="" />
    </div>
  );
};

export default Index;
