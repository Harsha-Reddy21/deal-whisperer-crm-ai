import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Users, TrendingUp, Calendar, CheckCircle, AlertCircle, Download, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImportResult {
  success: number;
  errors: number;
  total: number;
  errorMessages: string[];
}

interface CSVData {
  headers: string[];
  rows: any[][];
}

const DataImporter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('contacts');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const importTypes = [
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Users,
      color: 'text-blue-600',
      description: 'Import customer and prospect contact information',
      sampleHeaders: ['name', 'email', 'company', 'phone', 'status', 'persona'],
      table: 'contacts'
    },
    {
      id: 'deals',
      label: 'Deals',
      icon: TrendingUp,
      color: 'text-green-600',
      description: 'Import sales opportunities and pipeline data',
      sampleHeaders: ['title', 'company', 'value', 'stage', 'probability', 'contact_name', 'next_step'],
      table: 'deals'
    },
    {
      id: 'activities',
      label: 'Activities',
      icon: Calendar,
      color: 'text-purple-600',
      description: 'Import sales activities and follow-ups',
      sampleHeaders: ['title', 'type', 'description', 'due_date', 'priority', 'status'],
      table: 'activities'
    }
  ];

  const parseCSV = (text: string): CSVData => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('CSV file is empty');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );
    
    return { headers, rows };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setCsvData(parsed);
        setImportResults(null);
        
        toast({
          title: "File loaded successfully",
          description: `Found ${parsed.rows.length} rows with ${parsed.headers.length} columns`,
        });
      } catch (error) {
        toast({
          title: "Error parsing CSV",
          description: error instanceof Error ? error.message : "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
  };

  const mapCSVToDatabase = (headers: string[], row: any[], type: string) => {
    const data: any = { user_id: user?.id };
    
    headers.forEach((header, index) => {
      const value = row[index]?.trim();
      if (!value) return;
      
      // Map common variations of column names
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      switch (type) {
        case 'contacts':
          if (['name', 'full_name', 'contact_name'].includes(normalizedHeader)) data.name = value;
          else if (['email', 'email_address'].includes(normalizedHeader)) data.email = value;
          else if (['company', 'organization', 'company_name'].includes(normalizedHeader)) data.company = value;
          else if (['phone', 'phone_number', 'mobile'].includes(normalizedHeader)) data.phone = value;
          else if (['status', 'lead_status'].includes(normalizedHeader)) data.status = value;
          else if (['persona', 'customer_persona', 'type'].includes(normalizedHeader)) data.persona = value;
          break;
          
        case 'deals':
          if (['title', 'deal_name', 'opportunity'].includes(normalizedHeader)) data.title = value;
          else if (['company', 'organization', 'account'].includes(normalizedHeader)) data.company = value;
          else if (['value', 'amount', 'deal_value'].includes(normalizedHeader)) data.value = parseFloat(value) || 0;
          else if (['stage', 'deal_stage', 'pipeline_stage'].includes(normalizedHeader)) data.stage = value;
          else if (['probability', 'close_probability', 'win_probability'].includes(normalizedHeader)) data.probability = parseInt(value) || 0;
          else if (['contact_name', 'contact', 'primary_contact'].includes(normalizedHeader)) data.contact_name = value;
          else if (['next_step', 'next_action', 'follow_up'].includes(normalizedHeader)) data.next_step = value;
          break;
          
        case 'activities':
          if (['title', 'activity_name', 'subject'].includes(normalizedHeader)) data.title = value;
          else if (['type', 'activity_type'].includes(normalizedHeader)) data.type = value;
          else if (['description', 'notes', 'details'].includes(normalizedHeader)) data.description = value;
          else if (['due_date', 'date', 'scheduled_date'].includes(normalizedHeader)) data.due_date = value;
          else if (['priority', 'importance'].includes(normalizedHeader)) data.priority = value;
          else if (['status', 'activity_status'].includes(normalizedHeader)) data.status = value;
          break;
      }
    });
    
    return data;
  };

  const importData = async () => {
    if (!csvData || !user) return;
    
    setIsImporting(true);
    const currentType = importTypes.find(t => t.id === activeTab);
    if (!currentType) return;
    
    let success = 0;
    let errors = 0;
    const errorMessages: string[] = [];
    
    try {
      for (const row of csvData.rows) {
        try {
          const mappedData = mapCSVToDatabase(csvData.headers, row, activeTab);
          
          // Validate required fields
          if (activeTab === 'contacts' && !mappedData.name) {
            throw new Error('Name is required for contacts');
          }
          if (activeTab === 'deals' && !mappedData.title) {
            throw new Error('Title is required for deals');
          }
          if (activeTab === 'activities' && !mappedData.title) {
            throw new Error('Title is required for activities');
          }
          
          const { error } = await supabase
            .from(currentType.table as any)
            .insert(mappedData);
            
          if (error) throw error;
          success++;
        } catch (error) {
          errors++;
          errorMessages.push(`Row ${csvData.rows.indexOf(row) + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      setImportResults({
        success,
        errors,
        total: csvData.rows.length,
        errorMessages: errorMessages.slice(0, 10) // Show only first 10 errors
      });
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${success} out of ${csvData.rows.length} records`,
      });
      
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleCSV = (type: string) => {
    const currentType = importTypes.find(t => t.id === type);
    if (!currentType) return;
    
    const headers = currentType.sampleHeaders.join(',');
    const sampleRow = currentType.sampleHeaders.map(header => {
      switch (header) {
        case 'name': return 'John Doe';
        case 'email': return 'john@example.com';
        case 'company': return 'Acme Corp';
        case 'phone': return '+1-555-0123';
        case 'status': return 'Hot Lead';
        case 'persona': return 'Decision Maker';
        case 'title': return 'Enterprise Deal';
        case 'value': return '50000';
        case 'stage': return 'Discovery';
        case 'probability': return '75';
        case 'contact_name': return 'John Doe';
        case 'next_step': return 'Schedule demo';
        case 'type': return 'Call';
        case 'description': return 'Follow up call';
        case 'due_date': return '2024-02-15';
        case 'priority': return 'High';
        default: return 'Sample Data';
      }
    }).join(',');
    
    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${type}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-600" />
            Data Importer
          </CardTitle>
          <CardDescription>
            Import your existing data from CSV files into your CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100">
              {importTypes.map((type) => (
                <TabsTrigger key={type.id} value={type.id} className="flex items-center space-x-2">
                  <type.icon className={`w-4 h-4 ${type.color}`} />
                  <span>{type.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {importTypes.map((type) => (
              <TabsContent key={type.id} value={type.id} className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-slate-900 mb-2 flex items-center">
                    <type.icon className={`w-4 h-4 mr-2 ${type.color}`} />
                    Import {type.label}
                  </h3>
                  <p className="text-slate-600 text-sm mb-3">{type.description}</p>
                  
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSampleCSV(type.id)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download Sample CSV
                    </Button>
                    <div className="text-xs text-slate-500">
                      Expected columns: {type.sampleHeaders.join(', ')}
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id={`file-upload-${type.id}`}
                  />
                  <label htmlFor={`file-upload-${type.id}`} className="cursor-pointer">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      Choose CSV file to import
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Click to browse or drag and drop your CSV file here
                    </p>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Select File
                    </Button>
                  </label>
                </div>

                {/* File Preview */}
                {csvData && fileName && (
                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <Eye className="w-4 h-4 mr-2 text-green-600" />
                        File Preview: {fileName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-600">
                            <strong>Rows:</strong> {csvData.rows.length} | <strong>Columns:</strong> {csvData.headers.length}
                          </div>
                          <Button
                            onClick={importData}
                            disabled={isImporting}
                            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                          >
                            {isImporting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                Importing...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Import Data
                              </>
                            )}
                          </Button>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-lg overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-200">
                                {csvData.headers.map((header, index) => (
                                  <th key={index} className="text-left p-2 font-medium text-slate-700">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {csvData.rows.slice(0, 3).map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-slate-100">
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="p-2 text-slate-600">
                                      {cell || '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {csvData.rows.length > 3 && (
                            <div className="text-center text-xs text-slate-500 mt-2">
                              ... and {csvData.rows.length - 3} more rows
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Import Progress */}
                {isImporting && (
                  <Card className="border border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">Importing data...</p>
                          <p className="text-xs text-blue-700">Please wait while we process your file</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Import Results */}
                {importResults && (
                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        Import Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="text-2xl font-bold text-green-700">{importResults.success}</div>
                            <div className="text-sm text-green-600">Successful</div>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                            <div className="text-2xl font-bold text-red-700">{importResults.errors}</div>
                            <div className="text-sm text-red-600">Errors</div>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="text-2xl font-bold text-blue-700">{importResults.total}</div>
                            <div className="text-sm text-blue-600">Total</div>
                          </div>
                        </div>
                        
                        <Progress 
                          value={(importResults.success / importResults.total) * 100} 
                          className="h-2"
                        />
                        
                        {importResults.errorMessages.length > 0 && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                <p className="font-medium">Import Errors:</p>
                                {importResults.errorMessages.map((error, index) => (
                                  <p key={index} className="text-xs text-red-600">• {error}</p>
                                ))}
                                {importResults.errorMessages.length === 10 && importResults.errors > 10 && (
                                  <p className="text-xs text-slate-500">... and {importResults.errors - 10} more errors</p>
                                )}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataImporter; 