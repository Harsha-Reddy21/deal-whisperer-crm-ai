import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, FileSpreadsheet, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DataImportExport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'contacts' | 'leads' | 'deals'>('contacts');
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  const exportDataMutation = useMutation({
    mutationFn: async (dataType: 'contacts' | 'leads' | 'deals' | 'activities') => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from(dataType)
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Convert to CSV
      if (data.length === 0) {
        throw new Error(`No ${dataType} found to export`);
      }

      const headers = Object.keys(data[0]).filter(key => key !== 'user_id');
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data.length;
    },
    onSuccess: (count, dataType) => {
      toast({
        title: "Export successful",
        description: `Exported ${count} ${dataType} records to CSV file.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const importDataMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File, type: string }) => {
      if (!user) throw new Error('User not authenticated');

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      setImportProgress(0);
      setIsImporting(true);

      for (let i = 0; i < rows.length; i++) {
        try {
          const values = rows[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const record: any = { user_id: user.id };

          headers.forEach((header, index) => {
            if (values[index] && header !== 'id' && header !== 'created_at' && header !== 'updated_at') {
              record[header] = values[index];
            }
          });

          // Validate required fields based on type
          if (type === 'contacts' && !record.name) {
            throw new Error('Name is required for contacts');
          }
          if (type === 'leads' && !record.name) {
            throw new Error('Name is required for leads');
          }
          if (type === 'deals' && (!record.title || !record.value)) {
            throw new Error('Title and value are required for deals');
          }

          const { error } = await supabase
            .from(type as 'contacts' | 'leads' | 'deals')
            .insert(record);

          if (error) throw error;
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`Row ${i + 2}: ${error.message}`);
        }

        setImportProgress(((i + 1) / rows.length) * 100);
      }

      return { successCount, errorCount, errors };
    },
    onSuccess: (results) => {
      setImportResults(results);
      setIsImporting(false);
      queryClient.invalidateQueries({ queryKey: [importType] });
      
      if (results.errorCount === 0) {
        toast({
          title: "Import successful",
          description: `Successfully imported ${results.successCount} records.`,
        });
      } else {
        toast({
          title: "Import completed with errors",
          description: `Imported ${results.successCount} records, ${results.errorCount} failed.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setIsImporting(false);
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setImportFile(file);
      setImportResults(null);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (!importFile) return;
    importDataMutation.mutate({ file: importFile, type: importType });
  };

  const downloadTemplate = (type: string) => {
    const templates = {
      contacts: 'name,email,phone,company,title,status\nJohn Doe,john@example.com,555-0123,Acme Corp,Manager,Qualified',
      leads: 'name,email,phone,company,source,status,score\nJane Smith,jane@example.com,555-0124,Tech Inc,Website,new,75',
      deals: 'title,company,value,stage,probability,contact_name\nSoftware License,Acme Corp,50000,Discovery,25,John Doe'
    };

    const content = templates[type as keyof typeof templates];
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            Data Import & Export
          </CardTitle>
          <CardDescription>
            Bulk import and export your CRM data using CSV files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="export" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export">Export Data</TabsTrigger>
              <TabsTrigger value="import">Import Data</TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <FileSpreadsheet className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-medium text-slate-900 mb-2">Contacts</h3>
                    <Button 
                      size="sm" 
                      onClick={() => exportDataMutation.mutate('contacts')}
                      disabled={exportDataMutation.isPending}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-medium text-slate-900 mb-2">Leads</h3>
                    <Button 
                      size="sm" 
                      onClick={() => exportDataMutation.mutate('leads')}
                      disabled={exportDataMutation.isPending}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <FileSpreadsheet className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-medium text-slate-900 mb-2">Deals</h3>
                    <Button 
                      size="sm" 
                      onClick={() => exportDataMutation.mutate('deals')}
                      disabled={exportDataMutation.isPending}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <FileSpreadsheet className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <h3 className="font-medium text-slate-900 mb-2">Activities</h3>
                    <Button 
                      size="sm" 
                      onClick={() => exportDataMutation.mutate('activities')}
                      disabled={exportDataMutation.isPending}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Import Type</label>
                  <select
                    value={importType}
                    onChange={(e) => setImportType(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="contacts">Contacts</option>
                    <option value="leads">Leads</option>
                    <option value="deals">Deals</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate(importType)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <span className="text-sm text-slate-600">
                    Download a template to see the required format
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {importFile && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900">Ready to import</h4>
                        <p className="text-sm text-slate-600">File: {importFile.name}</p>
                      </div>
                      <Button
                        onClick={handleImport}
                        disabled={isImporting}
                        className="bg-gradient-to-r from-blue-600 to-purple-600"
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
                  </div>
                )}

                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Import Progress</span>
                      <span>{Math.round(importProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {importResults && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="border border-green-200 bg-green-50">
                        <CardContent className="p-4 text-center">
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <h3 className="font-medium text-green-900">Successful</h3>
                          <p className="text-2xl font-bold text-green-600">{importResults.successCount}</p>
                        </CardContent>
                      </Card>

                      <Card className="border border-red-200 bg-red-50">
                        <CardContent className="p-4 text-center">
                          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          <h3 className="font-medium text-red-900">Failed</h3>
                          <p className="text-2xl font-bold text-red-600">{importResults.errorCount}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {importResults.errors.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-slate-900">Import Errors:</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {importResults.errors.map((error: string, index: number) => (
                            <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataImportExport; 