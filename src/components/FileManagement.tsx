
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Upload, Download, Trash2, Image, FileVideo, Music, Archive, Plus } from 'lucide-react';
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

const FileManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
          <p className="text-slate-600">Upload, organize, and share files with your team</p>
        </div>
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
    </div>
  );
};

export default FileManagement;
