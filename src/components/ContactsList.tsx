
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Search, MessageSquare, Calendar, Mail } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  status: string;
  score: number;
  lastContact: string;
  persona: string;
  avatar?: string;
}

const ContactsList = () => {
  const contacts: Contact[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      company: 'TechCorp Inc.',
      title: 'CTO',
      email: 'sarah.j@techcorp.com',
      phone: '+1 (555) 123-4567',
      status: 'Hot Lead',
      score: 92,
      lastContact: '2 hours ago',
      persona: 'Technical Decision Maker'
    },
    {
      id: '2',
      name: 'Mike Chen',
      company: 'DataFlow Systems',
      title: 'VP Engineering',
      email: 'mchen@dataflow.com',
      phone: '+1 (555) 234-5678',
      status: 'Qualified',
      score: 78,
      lastContact: '1 day ago',
      persona: 'Budget Conscious'
    },
    {
      id: '3',
      name: 'Emma Davis',
      company: 'SecureBank Ltd',
      title: 'CISO',
      email: 'e.davis@securebank.com',
      phone: '+1 (555) 345-6789',
      status: 'Customer',
      score: 95,
      lastContact: '30 minutes ago',
      persona: 'Security Focused'
    },
    {
      id: '4',
      name: 'Alex Rodriguez',
      company: 'InnovateLab',
      title: 'CEO',
      email: 'alex@innovatelab.io',
      phone: '+1 (555) 456-7890',
      status: 'Cold Lead',
      score: 45,
      lastContact: '3 days ago',
      persona: 'Visionary Leader'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot Lead': return 'bg-red-100 text-red-800';
      case 'Qualified': return 'bg-yellow-100 text-yellow-800';
      case 'Customer': return 'bg-green-100 text-green-800';
      case 'Cold Lead': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Contact Management
              </CardTitle>
              <CardDescription>
                Manage your contacts with AI-generated personas
              </CardDescription>
            </div>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              Add Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input placeholder="Search contacts..." className="flex-1" />
            </div>

            <div className="grid gap-4">
              {contacts.map((contact) => (
                <Card key={contact.id} className="border border-slate-200 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                            <p className="text-sm text-slate-600">{contact.title} at {contact.company}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(contact.status)}>
                              {contact.status}
                            </Badge>
                            <span className={`text-sm font-medium ${getScoreColor(contact.score)}`}>
                              {contact.score}/100
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {contact.email}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Last contact: {contact.lastContact}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              AI Persona: {contact.persona}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Message
                            </Button>
                            <Button size="sm" variant="outline" className="hover:bg-purple-50">
                              View Persona
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactsList;
