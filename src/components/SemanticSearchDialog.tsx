import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Zap, TrendingUp, Users, Building2, Target, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { performSemanticSearch, type SemanticSearchRequest, type SemanticSearchResponse } from '@/lib/ai';

interface SemanticSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResult?: (result: any) => void;
}

const SemanticSearchDialog = ({ open, onOpenChange, onSelectResult }: SemanticSearchDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'deals' | 'contacts' | 'activities' | 'companies'>('all');
  const [maxResults, setMaxResults] = useState(10);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SemanticSearchResponse | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) {
      toast({
        title: "Search query required",
        description: "Please enter a search query to find similar content.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
      const request: SemanticSearchRequest = {
        query: searchQuery,
        searchType,
        similarityThreshold: 0.0, // Always return top results regardless of similarity
        maxResults,
        userId: user.id
      };

      const results = await performSemanticSearch(request);
      setSearchResults(results);

      toast({
        title: "Search Complete!",
        description: `Found ${results.totalResults} results in ${results.searchTime}ms with ${(results.averageSimilarity * 100).toFixed(1)}% average similarity.`,
      });

    } catch (error: any) {
      console.error('Semantic search error:', error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to perform semantic search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    if (onSelectResult) {
      onSelectResult(result);
    }
    onOpenChange(false);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'deal': return <Target className="w-4 h-4" />;
      case 'contact': return <Users className="w-4 h-4" />;
      case 'activity': return <Clock className="w-4 h-4" />;
      case 'company': return <Building2 className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'deal': return 'bg-green-100 text-green-800 border-green-200';
      case 'contact': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'activity': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'company': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600';
    if (similarity >= 0.8) return 'text-blue-600';
    if (similarity >= 0.7) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-purple-600" />
            AI Semantic Search
          </DialogTitle>
          <DialogDescription>
            Search your CRM data using natural language. Find the most similar deals, contacts, and activities based on meaning and context.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Query</label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., 'enterprise software deals', 'CTO contacts in fintech', 'follow-up activities'"
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Type</label>
                <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deals">Deals Only</SelectItem>
                    <SelectItem value="contacts">Contacts Only</SelectItem>
                    <SelectItem value="activities">Activities Only</SelectItem>
                    <SelectItem value="companies">Companies Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Results</label>
                <Select value={maxResults.toString()} onValueChange={(value) => setMaxResults(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 results</SelectItem>
                    <SelectItem value="10">10 results</SelectItem>
                    <SelectItem value="20">20 results</SelectItem>
                    <SelectItem value="50">50 results</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <Sparkles className="w-4 h-4 inline mr-1" />
                <strong>Smart Search:</strong> Results are automatically ranked by relevance. The most similar items appear first, regardless of similarity threshold.
              </p>
            </div>

            <Button 
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isSearching ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search with AI
                </>
              )}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div className="space-y-4">
              {/* Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{searchResults.totalResults}</div>
                  <div className="text-sm text-slate-600">Results Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{searchResults.searchTime}ms</div>
                  <div className="text-sm text-slate-600">Search Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{(searchResults.averageSimilarity * 100).toFixed(1)}%</div>
                  <div className="text-sm text-slate-600">Avg Similarity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{searchResults.results.filter(r => r.similarity >= 0.8).length}</div>
                  <div className="text-sm text-slate-600">High Matches</div>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                  Search Results (Ranked by Relevance)
                </h3>
                
                {searchResults.results.length === 0 ? (
                  <Card className="border border-slate-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-slate-600">
                        No results found. Try using different search terms or check if you have data in your CRM.
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  searchResults.results.map((result, index) => (
                    <Card key={`${result.type}-${result.id}-${index}`} className="border border-slate-200 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => handleSelectResult(result)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {index + 1}
                              </div>
                              <div className="p-2 bg-slate-100 rounded-lg">
                                {getResultIcon(result.type)}
                              </div>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold text-slate-900">
                                  {result.title || result.name || 'Untitled'}
                                </h4>
                                <Badge className={getResultTypeColor(result.type)}>
                                  {result.type.toUpperCase()}
                                </Badge>
                              </div>
                              
                              {result.company && (
                                <p className="text-sm text-slate-600 flex items-center">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  {result.company}
                                </p>
                              )}
                              
                              {result.stage && (
                                <p className="text-sm text-slate-600">
                                  Stage: {result.stage}
                                </p>
                              )}
                              
                              {result.value && (
                                <p className="text-sm text-slate-600">
                                  Value: ${result.value.toLocaleString()}
                                </p>
                              )}
                              
                              {result.persona && (
                                <p className="text-sm text-slate-600">
                                  {result.persona}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getSimilarityColor(result.similarity)}`}>
                              {(result.similarity * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500">Similarity</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {searchResults && searchResults.results.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchResults(null);
                  setSearchQuery('');
                }}
              >
                New Search
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SemanticSearchDialog; 