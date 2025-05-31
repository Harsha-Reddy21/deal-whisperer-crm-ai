
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Calendar, User, MessageSquare, TrendingUp } from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  probability: number;
  stage: string;
  contact: string;
  lastActivity: string;
  nextStep: string;
}

interface DealsPipelineProps {
  onSelectDeal: (deal: Deal) => void;
}

const DealsPipeline = ({ onSelectDeal }: DealsPipelineProps) => {
  const deals: Deal[] = [
    {
      id: '1',
      title: 'Enterprise Software License',
      company: 'TechCorp Inc.',
      value: 125000,
      probability: 85,
      stage: 'Negotiation',
      contact: 'Sarah Johnson',
      lastActivity: '2 hours ago',
      nextStep: 'Send final proposal'
    },
    {
      id: '2',
      title: 'Cloud Migration Project',
      company: 'DataFlow Systems',
      value: 75000,
      probability: 60,
      stage: 'Proposal',
      contact: 'Mike Chen',
      lastActivity: '1 day ago',
      nextStep: 'Schedule technical demo'
    },
    {
      id: '3',
      title: 'Security Audit Services',
      company: 'SecureBank Ltd',
      value: 45000,
      probability: 90,
      stage: 'Closing',
      contact: 'Emma Davis',
      lastActivity: '30 minutes ago',
      nextStep: 'Contract signature'
    },
    {
      id: '4',
      title: 'AI Implementation',
      company: 'InnovateLab',
      value: 200000,
      probability: 40,
      stage: 'Discovery',
      contact: 'Alex Rodriguez',
      lastActivity: '3 days ago',
      nextStep: 'Needs assessment call'
    }
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Discovery': return 'bg-blue-100 text-blue-800';
      case 'Proposal': return 'bg-yellow-100 text-yellow-800';
      case 'Negotiation': return 'bg-orange-100 text-orange-800';
      case 'Closing': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    if (probability >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Sales Pipeline
          </CardTitle>
          <CardDescription>
            Track your deals and get AI-powered recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {deals.map((deal) => (
              <Card key={deal.id} className="border border-slate-200 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onSelectDeal(deal)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">{deal.title}</h3>
                        <Badge className={getStageColor(deal.stage)}>
                          {deal.stage}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-slate-600">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {deal.company}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          ${deal.value.toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {deal.lastActivity}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-slate-600">Close Probability:</span>
                          <span className={`text-sm font-medium ${getProbabilityColor(deal.probability)}`}>
                            {deal.probability}%
                          </span>
                          <Progress value={deal.probability} className="w-16" />
                        </div>
                        <Button size="sm" variant="outline" className="hover:bg-blue-50">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          AI Coach
                        </Button>
                      </div>

                      <div className="text-sm">
                        <span className="text-slate-600">Next step:</span>
                        <span className="ml-1 text-slate-900 font-medium">{deal.nextStep}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealsPipeline;
