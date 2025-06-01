import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Zap, CheckCircle, AlertCircle, ExternalLink, Sync, Key } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  type: string;
  config: any;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
}

const IntegrationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [configData, setConfigData] = useState<any>({});

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['integrations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async ({ type, config }: { type: string, config: any }) => {
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          user_id: user?.id,
          type,
          config,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setShowConfigDialog(false);
      setConfigData({});
      toast({
        title: "Integration configured",
        description: "Your integration has been set up successfully.",
      });
    }
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: async ({ id, config, is_active }: { id: string, config?: any, is_active?: boolean }) => {
      const updateData: any = {};
      if (config !== undefined) updateData.config = config;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('integrations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({
        title: "Integration updated",
        description: "Your integration settings have been updated.",
      });
    }
  });

  const syncIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      // Simulate sync operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from('integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', integrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({
        title: "Sync completed",
        description: "Integration data has been synchronized.",
      });
    }
  });

  const availableIntegrations = [
    {
      type: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sync your meetings and appointments',
      icon: '📅',
      fields: [
        { key: 'client_id', label: 'Client ID', type: 'text', required: true },
        { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
        { key: 'calendar_id', label: 'Calendar ID', type: 'text', required: false }
      ]
    },
    {
      type: 'outlook',
      name: 'Microsoft Outlook',
      description: 'Connect with Outlook email and calendar',
      icon: '📧',
      fields: [
        { key: 'tenant_id', label: 'Tenant ID', type: 'text', required: true },
        { key: 'client_id', label: 'Application ID', type: 'text', required: true },
        { key: 'client_secret', label: 'Client Secret', type: 'password', required: true }
      ]
    },
    {
      type: 'slack',
      name: 'Slack',
      description: 'Get notifications in your Slack workspace',
      icon: '💬',
      fields: [
        { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
        { key: 'channel', label: 'Channel', type: 'text', required: false }
      ]
    },
    {
      type: 'zapier',
      name: 'Zapier',
      description: 'Connect with 5000+ apps via Zapier',
      icon: '⚡',
      fields: [
        { key: 'webhook_url', label: 'Zapier Webhook URL', type: 'url', required: true }
      ]
    },
    {
      type: 'mailchimp',
      name: 'Mailchimp',
      description: 'Sync contacts with your email marketing',
      icon: '🐵',
      fields: [
        { key: 'api_key', label: 'API Key', type: 'password', required: true },
        { key: 'list_id', label: 'List ID', type: 'text', required: true }
      ]
    },
    {
      type: 'hubspot',
      name: 'HubSpot',
      description: 'Sync data with HubSpot CRM',
      icon: '🧡',
      fields: [
        { key: 'api_key', label: 'Private App Token', type: 'password', required: true },
        { key: 'portal_id', label: 'Portal ID', type: 'text', required: true }
      ]
    }
  ];

  const getIntegrationByType = (type: string) => {
    return integrations.find(integration => integration.type === type);
  };

  const handleConfigureIntegration = (type: string) => {
    const existing = getIntegrationByType(type);
    setSelectedIntegration(type);
    setConfigData(existing?.config || {});
    setShowConfigDialog(true);
  };

  const handleSaveConfig = () => {
    if (!selectedIntegration) return;

    const existing = getIntegrationByType(selectedIntegration);
    if (existing) {
      updateIntegrationMutation.mutate({
        id: existing.id,
        config: configData
      });
    } else {
      createIntegrationMutation.mutate({
        type: selectedIntegration,
        config: configData
      });
    }
  };

  const handleToggleIntegration = (integrationId: string, isActive: boolean) => {
    updateIntegrationMutation.mutate({
      id: integrationId,
      is_active: isActive
    });
  };

  const selectedIntegrationConfig = availableIntegrations.find(
    int => int.type === selectedIntegration
  );

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="text-lg">Loading integrations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-600" />
            Integration Manager
          </CardTitle>
          <CardDescription>
            Connect your CRM with external services and automate your workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="available" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="available">Available Integrations</TabsTrigger>
              <TabsTrigger value="configured">Configured Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableIntegrations.map((integration) => {
                  const configured = getIntegrationByType(integration.type);
                  return (
                    <Card key={integration.type} className="border border-slate-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{integration.icon}</div>
                            <div>
                              <h3 className="font-medium text-slate-900">{integration.name}</h3>
                              <p className="text-sm text-slate-600">{integration.description}</p>
                            </div>
                          </div>
                          {configured && (
                            <Badge className={configured.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {configured.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleConfigureIntegration(integration.type)}
                          className="w-full"
                          variant={configured ? 'outline' : 'default'}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          {configured ? 'Reconfigure' : 'Configure'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="configured" className="space-y-6">
              {integrations.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No integrations configured</h3>
                  <p className="text-slate-600">Configure your first integration to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {integrations.map((integration) => {
                    const config = availableIntegrations.find(ai => ai.type === integration.type);
                    return (
                      <Card key={integration.id} className="border border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">{config?.icon || '🔗'}</div>
                              <div>
                                <h3 className="font-medium text-slate-900">{config?.name || integration.type}</h3>
                                <div className="flex items-center space-x-4 text-sm text-slate-600">
                                  <span>
                                    Last sync: {integration.last_sync 
                                      ? new Date(integration.last_sync).toLocaleString()
                                      : 'Never'
                                    }
                                  </span>
                                  <Badge className={integration.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                    {integration.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={integration.is_active}
                                onCheckedChange={(checked) => handleToggleIntegration(integration.id, checked)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => syncIntegrationMutation.mutate(integration.id)}
                                disabled={!integration.is_active || syncIntegrationMutation.isPending}
                              >
                                <Sync className="w-4 h-4 mr-1" />
                                Sync
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConfigureIntegration(integration.type)}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
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
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Key className="w-5 h-5 mr-2" />
              Configure {selectedIntegrationConfig?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your API credentials and configuration details
            </DialogDescription>
          </DialogHeader>
          
          {selectedIntegrationConfig && (
            <div className="space-y-4">
              {selectedIntegrationConfig.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    type={field.type}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={configData[field.key] || ''}
                    onChange={(e) => setConfigData(prev => ({
                      ...prev,
                      [field.key]: e.target.value
                    }))}
                    required={field.required}
                  />
                </div>
              ))}

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Setup Instructions</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Visit the {selectedIntegrationConfig.name} developer console to obtain your API credentials.
                      Make sure to whitelist your domain and set appropriate permissions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowConfigDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveConfig}
                  disabled={createIntegrationMutation.isPending || updateIntegrationMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {createIntegrationMutation.isPending || updateIntegrationMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationManager; 