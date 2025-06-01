import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, Download, Trash2, Search, Eye, Share, Folder, File } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileItem {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  contact_id?: string;
  deal_id?: string;
  created_at: string;
  contact_name?: string;
  deal_title?: string;
}

const FileManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');
  const [selectedDeal, setSelectedDeal] = useState('');

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ['files', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('files')
        .select(`
          *,
          contacts(name),
          deals(title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(file => ({
        id: file.id,
        filename: file.filename,
        file_path: file.file_path,
        file_size: file.file_size || 0,
        mime_type: file.mime_type || '',
        contact_id: file.contact_id,
        deal_id: file.deal_id,
        created_at: file.created_at,
        contact_name: file.contacts?.name,
        deal_title: file.deals?.title
      }));
    },
    enabled: !!user,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('deals')
        .select('id, title')
        .eq('user_id', user.id)
        .order('title');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadPromises = files.map(async (file) => {
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save file metadata to database
        const { data, error } = await supabase
          .from('files')
          .insert({
            user_id: user?.id,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            contact_id: selectedContact || null,
            deal_id: selectedDeal || null
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      return Promise.all(uploadPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setShowUploadDialog(false);
      setUploadingFiles([]);
      setSelectedContact('');
      setSelectedDeal('');
      toast({
        title: "Files uploaded",
        description: "Your files have been uploaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error uploading files",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteFilesMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      // Get file paths for storage deletion
      const filesToDelete = files.filter(f => fileIds.includes(f.id));
      
      // Delete from storage
      const deletePromises = filesToDelete.map(file => 
        supabase.storage.from('files').remove([file.file_path])
      );
      await Promise.all(deletePromises);

      // Delete from database
      const { error } = await supabase
        .from('files')
        .delete()
        .in('id', fileIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setSelectedFiles([]);
      toast({
        title: "Files deleted",
        description: "Selected files have been deleted successfully.",
      });
    }
  });

  const downloadFile = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
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
      toast({
        title: "Error downloading file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadingFiles(files);
    setShowUploadDialog(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
    return '📁';
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.deal_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="text-lg">Loading files...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                File Manager
              </CardTitle>
              <CardDescription>
                Upload, organize, and share documents with your contacts and deals
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {selectedFiles.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => deleteFilesMutation.mutate(selectedFiles)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedFiles.length})
                </Button>
              )}
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </label>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search files..." 
                className="flex-1" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredFiles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  {files.length === 0 ? "No files uploaded yet. Upload your first file!" : "No files match your search."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredFiles.map((file) => (
                  <Card key={file.id} className="border border-slate-200 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFiles(prev => [...prev, file.id]);
                              } else {
                                setSelectedFiles(prev => prev.filter(id => id !== file.id));
                              }
                            }}
                          />
                          <div className="text-2xl">{getFileIcon(file.mime_type)}</div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{file.filename}</h3>
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <span>{formatFileSize(file.file_size)}</span>
                              <span>{new Date(file.created_at).toLocaleDateString()}</span>
                              {file.contact_name && (
                                <Badge variant="outline">Contact: {file.contact_name}</Badge>
                              )}
                              {file.deal_title && (
                                <Badge variant="outline">Deal: {file.deal_title}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadFile(file)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(file.filename);
                              toast({
                                title: "Link copied",
                                description: "File link copied to clipboard.",
                              });
                            }}
                          >
                            <Share className="w-4 h-4" />
                          </Button>
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

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload files and associate them with contacts or deals
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Files to upload</label>
              <div className="space-y-2">
                {uploadingFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Associate with Contact (Optional)</label>
                <select
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select contact...</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Associate with Deal (Optional)</label>
                <select
                  value={selectedDeal}
                  onChange={(e) => setSelectedDeal(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select deal...</option>
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => uploadFilesMutation.mutate(uploadingFiles)}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
                disabled={uploadFilesMutation.isPending}
              >
                {uploadFilesMutation.isPending ? 'Uploading...' : 'Upload Files'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileManager; 