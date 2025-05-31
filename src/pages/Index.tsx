
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, DollarSign, Target, MessageSquare, Calendar } from 'lucide-react';
import DealsPipeline from '@/components/DealsPipeline';
import ContactsList from '@/components/ContactsList';
import AICoach from '@/components/AICoach';
import ObjectionHandler from '@/components/ObjectionHandler';

const Index = () => {
  const [selectedDeal, setSelectedDeal] = useState(null);

  const stats = [
    {
      title: "Total Contacts",
      value: "2,847",
      change: "+12%",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Deals",
      value: "127",
      change: "+8%",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Revenue Pipeline",
      value: "$1.2M",
      change: "+23%",
      icon: DollarSign,
      color: "text-purple-600"
    },
    {
      title: "Close Rate",
      value: "24.5%",
      change: "+3.2%",
      icon: Target,
      color: "text-orange-600"
    }
  ];

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
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Today's Tasks
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
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
        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="pipeline">Deal Pipeline</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="ai-coach">AI Coach</TabsTrigger>
            <TabsTrigger value="objection-handler">Objection Handler</TabsTrigger>
            <TabsTrigger value="analytics">Win-Loss Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <DealsPipeline onSelectDeal={setSelectedDeal} />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <ContactsList />
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
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
