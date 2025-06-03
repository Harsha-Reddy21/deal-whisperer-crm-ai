import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Users, Activity, Target, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ReportsDashboard = () => {
  const { user } = useAuth();

  // Fetch sales performance data
  const { data: salesData } = useQuery({
    queryKey: ['sales-reports', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [dealsResult, activitiesResult, leadsResult, contactsResult] = await Promise.all([
        supabase.from('deals').select('*').eq('user_id', user.id),
        supabase.from('activities').select('*').eq('user_id', user.id),
        supabase.from('leads').select('*').eq('user_id', user.id),
        supabase.from('contacts').select('*').eq('user_id', user.id)
      ]);

      const deals = dealsResult.data || [];
      const activities = activitiesResult.data || [];
      const leads = leadsResult.data || [];
      const contacts = contactsResult.data || [];

      return {
        deals,
        activities,
        leads,
        contacts,
        totalRevenue: deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0),
        avgDealSize: deals.length > 0 ? deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0) / deals.length : 0,
        conversionRate: leads.length > 0 ? (deals.length / leads.length * 100) : 0
      };
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sample data for charts
  const dealsData = [
    { stage: 'Discovery', count: 8, value: 120000 },
    { stage: 'Proposal', count: 5, value: 85000 },
    { stage: 'Negotiation', count: 3, value: 75000 },
    { stage: 'Closing', count: 2, value: 45000 }
  ];

  const monthlyData = [
    { month: 'Jan', revenue: 45000, deals: 12 },
    { month: 'Feb', revenue: 52000, deals: 15 },
    { month: 'Mar', revenue: 48000, deals: 11 },
    { month: 'Apr', revenue: 61000, deals: 18 },
    { month: 'May', revenue: 67000, deals: 20 },
    { month: 'Jun', revenue: 73000, deals: 22 }
  ];

  const activityData = [
    { name: 'Emails', value: 145, color: '#3b82f6' },
    { name: 'Calls', value: 89, color: '#10b981' },
    { name: 'Meetings', value: 34, color: '#f59e0b' },
    { name: 'Tasks', value: 67, color: '#8b5cf6' }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart className="w-5 h-5 mr-2 text-blue-600" />
            Sales Reports & Analytics
          </CardTitle>
          <CardDescription>
            Comprehensive insights into your sales performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Total Revenue</p>
                        <p className="text-2xl font-bold">${salesData?.totalRevenue?.toLocaleString() || '0'}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-green-600">+15.3% from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Active Deals</p>
                        <p className="text-2xl font-bold">{salesData?.deals?.length || 0}</p>
                      </div>
                      <Target className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-blue-600">+8 new this month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Conversion Rate</p>
                        <p className="text-2xl font-bold">{salesData?.conversionRate?.toFixed(1) || '0'}%</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-purple-600">+2.1% improvement</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Avg Deal Size</p>
                        <p className="text-2xl font-bold">${salesData?.avgDealSize?.toLocaleString() || '0'}</p>
                      </div>
                      <Users className="w-8 h-8 text-orange-600" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-orange-600">+12% from last month</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Deals by Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dealsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stage" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="deals" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deal Value by Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dealsData.map((stage, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">{stage.stage}</span>
                              <span className="text-sm text-slate-600">${stage.value.toLocaleString()}</span>
                            </div>
                            <Progress value={(stage.value / 120000) * 100} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Deal Count by Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dealsData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="stage" type="category" />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-6">
              {/* Contacts content */}
            </TabsContent>

            <TabsContent value="activities" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={activityData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {activityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Activity Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {activityData.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: activity.color }}
                            ></div>
                            <span className="font-medium">{activity.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{activity.value}</div>
                            <div className="text-sm text-slate-600">this month</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="forecasting" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Revenue Forecast
                    </CardTitle>
                    <CardDescription>
                      Projected revenue based on current pipeline and historical data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">$425K</div>
                        <div className="text-sm text-slate-600">Q2 Forecast</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">$1.2M</div>
                        <div className="text-sm text-slate-600">Annual Forecast</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">87%</div>
                        <div className="text-sm text-slate-600">Confidence Score</div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Actual" />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} name="Forecast" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsDashboard;
