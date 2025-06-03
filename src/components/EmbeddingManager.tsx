import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Check, RefreshCw } from 'lucide-react';
import { generateEmbeddingsForAllData } from '@/lib/ai';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

// Simple auth hook for this component
function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get the current user
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    fetchUser();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user };
}

export function EmbeddingManager() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    deals: number;
    contacts: number;
    leads: number;
    errors: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateEmbeddings = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setError(null);
    
    try {
      // Process all embeddings
      const embeddingResult = await generateEmbeddingsForAllData(user.id);
      
      setProgress(100);
      setResult({
        ...embeddingResult,
        total: embeddingResult.deals + embeddingResult.contacts + embeddingResult.leads
      });
      
    } catch (err) {
      setError(`Error generating embeddings: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Embedding Manager</CardTitle>
        <CardDescription>
          Generate and update embeddings for CRM data to enable AI-powered semantic search and analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="generate">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Embeddings</TabsTrigger>
            <TabsTrigger value="stats">Embedding Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Generate Embeddings for All Data</h3>
              <p className="text-sm text-muted-foreground">
                This will generate embeddings for all existing deals, contacts, and leads in your CRM.
                The process may take several minutes depending on the amount of data.
              </p>
              
              {isProcessing && (
                <div className="space-y-2 my-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing embeddings...</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              
              {result && !isProcessing && (
                <Alert className="my-4 border-green-500 bg-green-50 text-green-900">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Embedding Generation Complete</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p>Successfully processed {result.total} items:</p>
                      <ul className="list-disc pl-5">
                        <li>{result.deals} deals</li>
                        <li>{result.contacts} contacts</li>
                        <li>{result.leads} leads</li>
                      </ul>
                      {result.errors > 0 && (
                        <p className="text-yellow-600">Encountered {result.errors} errors during processing.</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive" className="my-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="stats" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Embedding Statistics</h3>
              <p className="text-sm text-muted-foreground">
                View statistics about your CRM data embeddings.
              </p>
              
              {/* Stats display would go here - could be added in a future enhancement */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Deals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{result?.deals || 0}</p>
                    <p className="text-sm text-muted-foreground">With embeddings</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{result?.contacts || 0}</p>
                    <p className="text-sm text-muted-foreground">With embeddings</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{result?.leads || 0}</p>
                    <p className="text-sm text-muted-foreground">With embeddings</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleGenerateEmbeddings} 
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Generate Embeddings for All Data'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default EmbeddingManager; 