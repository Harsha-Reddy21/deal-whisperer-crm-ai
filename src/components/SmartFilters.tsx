
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Clock, TrendingDown, Filter, X } from 'lucide-react';

interface SmartFiltersProps {
  onFilterChange: (filters: any) => void;
  activeFilters: any;
}

const SmartFilters = ({ onFilterChange, activeFilters }: SmartFiltersProps) => {
  const [selectedFilters, setSelectedFilters] = useState(activeFilters || {});

  const smartFilters = [
    {
      id: 'high-risk',
      label: 'High Risk Deals',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-800 border-red-200',
      description: 'Deals with low probability or stalled progress',
      criteria: { probability: { max: 40 }, daysSinceActivity: { min: 5 } }
    },
    {
      id: 'stalled',
      label: 'Stalled Deals',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      description: 'No activity in the last 7 days',
      criteria: { daysSinceActivity: { min: 7 } }
    },
    {
      id: 'needs-attention',
      label: 'Needs Attention',
      icon: TrendingDown,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      description: 'Deals requiring immediate action',
      criteria: { stage: ['Discovery', 'Proposal'], daysSinceActivity: { min: 3 } }
    }
  ];

  const handleSmartFilter = (filterId: string) => {
    const filter = smartFilters.find(f => f.id === filterId);
    if (filter) {
      const newFilters = { ...selectedFilters, smart: filterId };
      setSelectedFilters(newFilters);
      onFilterChange(newFilters);
    }
  };

  const handleStageFilter = (stage: string) => {
    const newFilters = { ...selectedFilters, stage };
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleValueFilter = (range: string) => {
    const newFilters = { ...selectedFilters, valueRange: range };
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setSelectedFilters({});
    onFilterChange({});
  };

  const activeFilterCount = Object.keys(selectedFilters).length;

  return (
    <Card className="border border-slate-200 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <h3 className="font-medium text-slate-900">Smart Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Smart AI Filters */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">AI-Powered Filters</h4>
            <div className="flex flex-wrap gap-2">
              {smartFilters.map((filter) => (
                <Button
                  key={filter.id}
                  variant="outline"
                  size="sm"
                  className={`${
                    selectedFilters.smart === filter.id 
                      ? filter.color 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => handleSmartFilter(filter.id)}
                >
                  <filter.icon className="w-3 h-3 mr-1" />
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Standard Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Stage</label>
              <Select value={selectedFilters.stage || ''} onValueChange={handleStageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All stages</SelectItem>
                  <SelectItem value="Discovery">Discovery</SelectItem>
                  <SelectItem value="Proposal">Proposal</SelectItem>
                  <SelectItem value="Negotiation">Negotiation</SelectItem>
                  <SelectItem value="Closing">Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Deal Value</label>
              <Select value={selectedFilters.valueRange || ''} onValueChange={handleValueFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All values" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All values</SelectItem>
                  <SelectItem value="0-10000">$0 - $10K</SelectItem>
                  <SelectItem value="10000-50000">$10K - $50K</SelectItem>
                  <SelectItem value="50000-100000">$50K - $100K</SelectItem>
                  <SelectItem value="100000+">$100K+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Probability</label>
              <Select value={selectedFilters.probability || ''} onValueChange={(value) => {
                const newFilters = { ...selectedFilters, probability: value };
                setSelectedFilters(newFilters);
                onFilterChange(newFilters);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All probabilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All probabilities</SelectItem>
                  <SelectItem value="high">High (70%+)</SelectItem>
                  <SelectItem value="medium">Medium (40-70%)</SelectItem>
                  <SelectItem value="low">Low (<40%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Description */}
          {selectedFilters.smart && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Filter Active:</strong> {smartFilters.find(f => f.id === selectedFilters.smart)?.description}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartFilters;
