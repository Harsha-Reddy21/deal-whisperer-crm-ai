
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Search, MessageSquare, Calendar, Mail, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Contact {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  status: string;
  score: number;
  last_contact: string;
  persona: string;
  avatar?: string;
}

const ContactsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading contacts",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data.map(contact => ({
        id: contact.id,
        name: contact.name,
        company: contact.company || '',
        title: contact.title || '',
        email: contact.email || '',
        phone: contact.phone || '',
        status: contact.status || 'Cold Lead',
        score: contact.score || 0,
        last_contact: contact.last_contact ? new Date(contact.last_contact).toLocaleDateString() : 'No contact',
        persona: contact.persona || 'Not analyzed',
        avatar: contact.avatar
      }));
    },
    enabled: !!user,
  });

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createSampleContact = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        name: 'John Smith',
        company: 'Tech Innovations Inc.',
        title: 'CTO',
        email: 'john.smith@techinnovations.com',
        phone: '+1 (555) 123-4567',
        status: 'Qualified',
        score: 75,
        persona: 'Technical Decision Maker'
      });

    if (error) {
      toast({
        title: "Error creating contact",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Contact created!",
        description: "New sample contact has been added.",
      });
      refetch();
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-lg">Loading contacts...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Button onClick={createSampleContact} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search contacts..." 
                className="flex-1" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredContacts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  {contacts.length === 0 ? "No contacts found. Create your first contact to get started!" : "No contacts match your search."}
                </p>
                {contacts.length === 0 && (
                  <Button onClick={createSampleContact} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Sample Contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredContacts.map((contact) => (
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
                              Last contact: {contact.last_contact}
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactsList;
