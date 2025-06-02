import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, Download, Trash2, Image, FileVideo, Music, Archive, Plus, Database, Users, TrendingUp, Calendar, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FileRecord {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  contact_id?: string;
  deal_id?: string;
  created_at: string;
}

interface ImportResult {
  success: number;
  errors: number;
  total: number;
  errorMessages: string[];
}

interface CSVData {
  headers: string[];
  rows: string[][];
}

const FileManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('files');
  
  // CSV Import states
  const [importType, setImportType] = useState<'contacts' | 'leads' | 'deals' | 'activities' | 'companies'>('contacts');
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);

  const importTypes = [
    { id: 'contacts', label: 'Contacts', icon: Users, color: 'text-blue-600' },
    { id: 'leads', label: 'Leads', icon: TrendingUp, color: 'text-green-600' },
    { id: 'deals', label: 'Deals/Pipeline', icon: Database, color: 'text-purple-600' },
    { id: 'activities', label: 'Activities', icon: Calendar, color: 'text-orange-600' },
    { id: 'companies', label: 'Companies', icon: Building2, color: 'text-indigo-600' },
  ];

  // Fetch files
  const { data: files, isLoading } = useQuery({
    queryKey: ['files', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FileRecord[];
    },
    enabled: !!user
  });

  // CSV parsing function
  const parseCSV = (text: string): CSVData => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('CSV file is empty');
    
    console.log('Raw CSV lines:', lines.slice(0, 3)); // Log first 3 lines
    
    // More robust CSV parsing that handles quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
    const rows = lines.slice(1).map(line => parseCSVLine(line).map(cell => cell.replace(/"/g, '')));
    
    console.log('Parsed headers:', headers);
    console.log('First few rows:', rows.slice(0, 3));
    
    // Validate that all rows have the same number of columns as headers
    const invalidRows = rows.filter(row => row.length !== headers.length);
    if (invalidRows.length > 0) {
      console.warn(`Found ${invalidRows.length} rows with mismatched column count`);
    }
    
    return { headers, rows: rows.filter(row => row.length === headers.length) };
  };

  // Map CSV data to database format
  const mapCSVToDatabase = (headers: string[], row: string[], type: string) => {
    const data: any = { user_id: user?.id };
    
    console.log('Mapping CSV data:', { headers, row, type });
    
    headers.forEach((header, index) => {
      const value = row[index]?.trim();
      if (!value) return;
      
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      console.log(`Processing header: "${header}" -> "${normalizedHeader}" with value: "${value}"`);
      
      switch (type) {
        case 'contacts':
          if (['name', 'full_name', 'contact_name'].includes(normalizedHeader)) {
            data.name = value;
            console.log('Mapped name:', value);
          }
          else if (['email', 'email_address'].includes(normalizedHeader)) data.email = value;
          else if (['company', 'organization', 'company_name'].includes(normalizedHeader)) data.company = value;
          else if (['phone', 'phone_number', 'mobile'].includes(normalizedHeader)) data.phone = value;
          else if (['status', 'contact_status'].includes(normalizedHeader)) data.status = value;
          else if (['persona', 'customer_persona', 'type'].includes(normalizedHeader)) data.persona = value;
          else if (['title', 'job_title', 'position'].includes(normalizedHeader)) data.title = value;
          else if (['score', 'lead_score'].includes(normalizedHeader)) data.score = parseInt(value) || 0;
          break;
          
        case 'leads':
          if (['name', 'full_name', 'lead_name'].includes(normalizedHeader)) data.name = value;
          else if (['email', 'email_address'].includes(normalizedHeader)) data.email = value;
          else if (['company', 'organization', 'company_name'].includes(normalizedHeader)) data.company = value;
          else if (['phone', 'phone_number', 'mobile'].includes(normalizedHeader)) data.phone = value;
          else if (['status', 'lead_status'].includes(normalizedHeader)) data.status = value;
          else if (['source', 'lead_source'].includes(normalizedHeader)) data.source = value;
          else if (['score', 'lead_score'].includes(normalizedHeader)) data.score = parseInt(value) || 0;
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
          if (['subject', 'title', 'activity_subject'].includes(normalizedHeader)) data.subject = value;
          else if (['type', 'activity_type'].includes(normalizedHeader)) data.type = value;
          else if (['description', 'notes', 'details'].includes(normalizedHeader)) data.description = value;
          else if (['priority', 'activity_priority'].includes(normalizedHeader)) data.priority = value;
          else if (['status', 'activity_status'].includes(normalizedHeader)) data.status = value;
          else if (['due_date', 'deadline', 'scheduled_date'].includes(normalizedHeader)) data.due_date = value;
          break;
          
        case 'companies':
          if (['name', 'company_name', 'organization'].includes(normalizedHeader)) data.name = value;
          else if (['website', 'company_website', 'url'].includes(normalizedHeader)) data.website = value;
          else if (['industry', 'sector', 'business_type'].includes(normalizedHeader)) data.industry = value;
          else if (['size', 'company_size', 'employee_size'].includes(normalizedHeader)) data.size = value;
          else if (['phone', 'phone_number', 'company_phone'].includes(normalizedHeader)) data.phone = value;
          else if (['email', 'company_email', 'contact_email'].includes(normalizedHeader)) data.email = value;
          else if (['address', 'street_address', 'location'].includes(normalizedHeader)) data.address = value;
          else if (['city', 'company_city'].includes(normalizedHeader)) data.city = value;
          else if (['state', 'province', 'region'].includes(normalizedHeader)) data.state = value;
          else if (['country', 'nation'].includes(normalizedHeader)) data.country = value;
          else if (['postal_code', 'zip_code', 'zip'].includes(normalizedHeader)) data.postal_code = value;
          else if (['description', 'company_description', 'about'].includes(normalizedHeader)) data.description = value;
          else if (['status', 'company_status', 'relationship'].includes(normalizedHeader)) data.status = value;
          else if (['revenue', 'annual_revenue', 'yearly_revenue'].includes(normalizedHeader)) data.revenue = parseInt(value) || 0;
          else if (['employees', 'employee_count', 'staff_count'].includes(normalizedHeader)) data.employees = parseInt(value) || 0;
          else if (['founded_year', 'founded', 'established'].includes(normalizedHeader)) data.founded_year = parseInt(value) || 0;
          else if (['linkedin_url', 'linkedin', 'linkedin_profile'].includes(normalizedHeader)) data.linkedin_url = value;
          else if (['twitter_url', 'twitter', 'twitter_profile'].includes(normalizedHeader)) data.twitter_url = value;
          else if (['facebook_url', 'facebook', 'facebook_profile'].includes(normalizedHeader)) data.facebook_url = value;
          else if (['notes', 'company_notes', 'remarks'].includes(normalizedHeader)) data.notes = value;
          else if (['score', 'company_score', 'rating'].includes(normalizedHeader)) data.score = parseInt(value) || 0;
          else if (['last_contact', 'last_contacted'].includes(normalizedHeader)) data.last_contact = value;
          else if (['next_follow_up', 'follow_up_date', 'next_contact'].includes(normalizedHeader)) data.next_follow_up = value;
          break;
      }
    });
    
    console.log('Final mapped data:', data);
    return data;
  };

  // Handle CSV file upload for import
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  // Import CSV data
  const importCSVData = async () => {
    if (!csvData || !user) return;

    setIsImporting(true);
    const results: ImportResult = { success: 0, errors: 0, total: csvData.rows.length, errorMessages: [] };

    try {
      for (const row of csvData.rows) {
        try {
          const mappedData = mapCSVToDatabase(csvData.headers, row, importType);
          
          // Ensure required fields are present
          if (importType === 'contacts' && !mappedData.name) {
            throw new Error('Name is required for contacts');
          }
          if (importType === 'leads' && !mappedData.name) {
            throw new Error('Name is required for leads');
          }
          if (importType === 'deals' && !mappedData.title) {
            throw new Error('Title is required for deals');
          }
          if (importType === 'activities' && (!mappedData.subject || !mappedData.type)) {
            throw new Error('Subject and type are required for activities');
          }
          if (importType === 'companies' && !mappedData.name) {
            throw new Error('Name is required for companies');
          }

          const { error } = await supabase
            .from(importType)
            .insert(mappedData);

          if (error) throw error;
          results.success++;
        } catch (error: any) {
          results.errors++;
          results.errorMessages.push(`Row ${results.success + results.errors}: ${error.message}`);
        }
      }

      setImportResults(results);
      
      if (results.success > 0) {
        // Invalidate all related queries to refresh dashboard and component data
        queryClient.invalidateQueries({ queryKey: [importType] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['deals'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['sales-reports'] });
        
        toast({
          title: "Import completed",
          description: `Successfully imported ${results.success} out of ${results.total} records`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Download CSV template
  const downloadTemplate = (type: string) => {
    const templates = {
      contacts: 'name,email,company,phone,status,persona,title,score\nJohn Doe,john@example.com,Acme Corp,555-1234,Qualified,decision_maker,CEO,85',
      leads: 'name,email,company,phone,status,source,score\nJane Smith,jane@example.com,Tech Inc,555-5678,new,form,75',
      deals: 'title,company,value,stage,probability,contact_name,next_step\nBig Deal,Acme Corp,50000,Discovery,25,John Doe,Schedule demo',
      activities: 'subject,type,description,priority,status,due_date\nFollow up call,call,Call to discuss proposal,high,pending,2024-01-15',
      companies: 'name,website,industry,size,phone,email,address,city,state,country,description,status,revenue,employees,founded_year,linkedin_url,notes,score\nAcme Corporation,https://acme.com,Technology,large,555-0123,contact@acme.com,123 Business St,San Francisco,CA,USA,Leading technology company,prospect,5000000,250,2010,https://linkedin.com/company/acme,Great potential client,85'
    };

    const csvContent = templates[type as keyof typeof templates];
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('User not found');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('crm-files')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Save file record to database
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type
        });
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast({ title: 'File uploaded successfully!' });
      setIsDialogOpen(false);
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast({ title: 'Error uploading file', description: error.message, variant: 'destructive' });
      setUploadProgress(0);
    },
    onMutate: () => {
      setUploading(true);
      // Simulate progress for demo
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
    },
    onSettled: () => {
      setUploading(false);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (file: FileRecord) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('crm-files')
        .remove([file.file_path]);
      
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast({ title: 'File deleted successfully!' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting file', description: error.message, variant: 'destructive' });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload files smaller than 10MB', variant: 'destructive' });
      return;
    }
    
    uploadFileMutation.mutate(file);
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('crm-files')
        .download(file.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: 'Error downloading file', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = (file: FileRecord) => {
    if (confirm(`Are you sure you want to delete "${file.filename}"?`)) {
      deleteFileMutation.mutate(file);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="w-8 h-8 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-8 h-8 text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="w-8 h-8 text-orange-500" />;
    return <FileText className="w-8 h-8 text-slate-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading files...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">File Management</h2>
          <p className="text-slate-600">Upload files and import CSV data into your CRM</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100">
          <TabsTrigger value="files" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>File Storage</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>CSV Import</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-6">
          <div className="flex items-center justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload New File</DialogTitle>
                  <DialogDescription>
                    Upload documents, images, or other files to your CRM
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">Choose a file to upload</p>
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      accept="*/*"
                    />
                    <p className="text-xs text-slate-500 mt-2">Maximum file size: 10MB</p>
                  </div>
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {files && files.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map((file) => (
                <Card key={file.id} className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.mime_type)}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">{file.filename}</CardTitle>
                        <CardDescription>
                          {formatFileSize(file.file_size)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownload(file)}>
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDelete(file)}
                          disabled={deleteFileMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Files Uploaded</h3>
                <p className="text-slate-600 text-center mb-6">
                  Start by uploading your first document, image, or file
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-600" />
                CSV Data Import
              </CardTitle>
              <CardDescription>
                Import your existing data from CSV files into your CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Import Type Selection */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {importTypes.map((type) => (
                  <Card 
                    key={type.id} 
                    className={`cursor-pointer transition-all duration-200 ${
                      importType === type.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setImportType(type.id as any)}
                  >
                    <CardContent className="p-4 text-center">
                      <type.icon className={`w-8 h-8 mx-auto mb-2 ${type.color}`} />
                      <p className="text-sm font-medium">{type.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Template Download */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-900">Download Template</h4>
                  <p className="text-sm text-slate-600">Get a sample CSV file with the correct format</p>
                </div>
                <Button variant="outline" onClick={() => downloadTemplate(importType)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Choose CSV file to import
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Click to browse or drag and drop your CSV file here
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button variant="outline" asChild>
                    <label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Select CSV File
                    </label>
                  </Button>
                </div>

                {/* File Preview */}
                {csvData && (
                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
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
                            onClick={importCSVData}
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
                        
                        {/* Headers Preview */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Column Headers:</h4>
                          <div className="flex flex-wrap gap-2">
                            {csvData.headers.map((header, index) => (
                              <Badge key={index} variant="outline">{header}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* Data Preview */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Data Preview (first 3 rows):</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-slate-200 rounded">
                              <thead className="bg-slate-50">
                                <tr>
                                  {csvData.headers.map((header, index) => (
                                    <th key={index} className="p-2 text-left border-r border-slate-200 last:border-r-0">
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {csvData.rows.slice(0, 3).map((row, rowIndex) => (
                                  <tr key={rowIndex} className="border-t border-slate-200">
                                    {row.map((cell, cellIndex) => (
                                      <td key={cellIndex} className="p-2 border-r border-slate-200 last:border-r-0">
                                        {cell || '-'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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
                        {importResults.errors === 0 ? (
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" />
                        )}
                        Import Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                            <div className="text-sm text-green-700">Successful</div>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                            <div className="text-sm text-red-700">Errors</div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
                            <div className="text-sm text-blue-700">Total</div>
                          </div>
                        </div>

                        {importResults.errorMessages.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-red-700">Error Details:</h4>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {importResults.errorMessages.map((error, index) => (
                                <Alert key={index} className="py-2">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription className="text-xs">{error}</AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FileManagement;
