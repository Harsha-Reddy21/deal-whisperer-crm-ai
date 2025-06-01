import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Upload, 
  FileAudio, 
  FileVideo, 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  FileText, 
  Brain, 
  Mic, 
  Video, 
  Clock, 
  Calendar,
  Eye,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  isOpenAIConfigured,
  transcribeAudio,
  summarizeTranscript,
  validateTranscriptionFile,
  getEstimatedTranscriptionTime,
  type TranscriptionRequest,
  type SummarizationRequest
} from '@/lib/ai';

interface TranscriptFile {
  id: string;
  name: string;
  type: 'audio' | 'video';
  file_url: string;
  file_size: number;
  duration?: number;
  transcript?: string;
  summary?: string;
  status: 'uploaded' | 'transcribing' | 'transcribed' | 'summarized' | 'error';
  created_at: string;
  updated_at: string;
}

const TranscriptsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<TranscriptFile | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [deletingFile, setDeletingFile] = useState<TranscriptFile | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Fetch transcript files
  const { data: transcriptFiles = [], isLoading, refetch } = useQuery({
    queryKey: ['transcript-files', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // For now, we'll use local storage to simulate database
      // In production, this would be a proper database table
      const stored = localStorage.getItem(`transcript-files-${user.id}`);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!user,
  });

  // Save transcript files to storage
  const saveTranscriptFiles = (files: TranscriptFile[]) => {
    if (user) {
      localStorage.setItem(`transcript-files-${user.id}`, JSON.stringify(files));
      queryClient.invalidateQueries({ queryKey: ['transcript-files'] });
    }
  };

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('User not authenticated');

      // Simulate file upload (in production, upload to Supabase Storage)
      const fileUrl = URL.createObjectURL(file);
      
      const newFile: TranscriptFile = {
        id: `transcript_${Date.now()}`,
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : 'audio',
        file_url: fileUrl,
        file_size: file.size,
        status: 'uploaded',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updatedFiles = [...transcriptFiles, newFile];
      saveTranscriptFiles(updatedFiles);
      
      return newFile;
    },
    onSuccess: () => {
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
      setShowUploadDialog(false);
      setUploadingFile(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Transcribe file mutation
  const transcribeFileMutation = useMutation({
    mutationFn: async (file: TranscriptFile) => {
      if (!isOpenAIConfigured()) {
        throw new Error('OpenAI API key not configured');
      }

      // Update status to transcribing
      const updatedFiles = transcriptFiles.map(f => 
        f.id === file.id ? { ...f, status: 'transcribing' as const } : f
      );
      saveTranscriptFiles(updatedFiles);

      // Create a File object from the stored file URL
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const audioFile = new File([blob], file.name, { type: blob.type });

      // Use real AI transcription service
      const transcriptionRequest: TranscriptionRequest = {
        audioFile: audioFile,
        language: 'en'
      };

      const result = await transcribeAudio(transcriptionRequest);

      if (!result.success) {
        throw new Error('Transcription failed');
      }

      // Update with transcript
      const finalFiles = transcriptFiles.map(f => 
        f.id === file.id ? { 
          ...f, 
          transcript: result.transcript,
          status: 'transcribed' as const,
          duration: result.duration,
          updated_at: new Date().toISOString()
        } : f
      );
      saveTranscriptFiles(finalFiles);

      return result.transcript;
    },
    onSuccess: (transcript, file) => {
      toast({
        title: "Transcription completed",
        description: `Transcript generated for ${file.name}`,
      });
      refetch();
    },
    onError: (error: any, file) => {
      // Update status to error
      const updatedFiles = transcriptFiles.map(f => 
        f.id === file.id ? { ...f, status: 'error' as const } : f
      );
      saveTranscriptFiles(updatedFiles);
      
      toast({
        title: "Transcription failed",
        description: error.message,
        variant: "destructive",
      });
      refetch();
    }
  });

  // Summarize transcript mutation
  const summarizeTranscriptMutation = useMutation({
    mutationFn: async (file: TranscriptFile) => {
      if (!isOpenAIConfigured()) {
        throw new Error('OpenAI API key not configured');
      }

      if (!file.transcript) {
        throw new Error('No transcript available to summarize');
      }

      // Use real AI summarization service
      const summarizationRequest: SummarizationRequest = {
        transcript: file.transcript,
        fileName: file.name,
        summaryType: 'detailed',
        context: 'Business meeting or presentation'
      };

      const result = await summarizeTranscript(summarizationRequest);

      if (!result.success) {
        throw new Error('Summarization failed');
      }

      // Format the summary with additional details
      const formattedSummary = `Summary of ${file.name}:

${result.summary}

**Key Points:**
${result.keyPoints.map(point => `• ${point}`).join('\n')}

**Action Items:**
${result.actionItems.map(item => `• ${item}`).join('\n')}

**Topics Covered:**
${result.topics.map(topic => `• ${topic}`).join('\n')}

**Overall Sentiment:** ${result.sentiment}
**Analysis Confidence:** ${Math.round(result.confidence * 100)}%`;

      // Update with summary
      const updatedFiles = transcriptFiles.map(f => 
        f.id === file.id ? { 
          ...f, 
          summary: formattedSummary,
          status: 'summarized' as const,
          updated_at: new Date().toISOString()
        } : f
      );
      saveTranscriptFiles(updatedFiles);

      return formattedSummary;
    },
    onSuccess: (summary, file) => {
      toast({
        title: "Summary completed",
        description: `Summary generated for ${file.name}`,
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Summarization failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (file: TranscriptFile) => {
      const updatedFiles = transcriptFiles.filter(f => f.id !== file.id);
      saveTranscriptFiles(updatedFiles);
      
      // Revoke object URL to free memory
      if (file.file_url.startsWith('blob:')) {
        URL.revokeObjectURL(file.file_url);
      }
    },
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "The file has been removed successfully.",
      });
      setDeletingFile(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file using AI service validation
    const validation = validateTranscriptionFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(file);
    setShowUploadDialog(true);
  };

  const confirmUpload = () => {
    if (uploadingFile) {
      uploadFileMutation.mutate(uploadingFile);
    }
  };

  const handleTranscribe = (file: TranscriptFile) => {
    setIsTranscribing(true);
    transcribeFileMutation.mutate(file, {
      onSettled: () => setIsTranscribing(false)
    });
  };

  const handleSummarize = (file: TranscriptFile) => {
    setIsSummarizing(true);
    summarizeTranscriptMutation.mutate(file, {
      onSettled: () => setIsSummarizing(false)
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-blue-100 text-blue-800';
      case 'transcribing': return 'bg-yellow-100 text-yellow-800';
      case 'transcribed': return 'bg-green-100 text-green-800';
      case 'summarized': return 'bg-purple-100 text-purple-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (type: string) => {
    return type === 'video' ? <FileVideo className="w-5 h-5" /> : <FileAudio className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading transcripts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Transcripts</h2>
          <p className="text-slate-600">Upload audio/video files and generate AI-powered transcripts and summaries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
          <input
            id="file-upload"
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transcriptFiles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transcribed</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transcriptFiles.filter(f => f.status === 'transcribed' || f.status === 'summarized').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Summarized</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transcriptFiles.filter(f => f.status === 'summarized').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(transcriptFiles.reduce((sum, f) => sum + f.file_size, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files ({transcriptFiles.length})</CardTitle>
          <CardDescription>
            Manage your audio and video files with AI-powered transcription and summarization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transcriptFiles.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded</h3>
              <p className="text-gray-500 mb-4">
                Upload your first audio or video file to get started with AI transcription
              </p>
              <Button 
                className="cursor-pointer"
                onClick={() => document.getElementById('file-upload-empty')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
              <input
                id="file-upload-empty"
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="grid gap-4">
              {transcriptFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900 truncate">{file.name}</h3>
                            <Badge className={getStatusColor(file.status)}>
                              {file.status}
                            </Badge>
                            <Badge variant="outline">
                              {file.type}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatFileSize(file.file_size)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(file.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {file.status === 'uploaded' && (
                              <Button
                                size="sm"
                                onClick={() => handleTranscribe(file)}
                                disabled={isTranscribing || !isOpenAIConfigured()}
                                className="bg-gradient-to-r from-green-600 to-blue-600"
                              >
                                {isTranscribing ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Transcribing...
                                  </>
                                ) : (
                                  <>
                                    <Mic className="w-4 h-4 mr-1" />
                                    Get Transcript
                                  </>
                                )}
                              </Button>
                            )}
                            
                            {(file.status === 'transcribed' || file.status === 'summarized') && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedFile(file);
                                    setShowTranscriptDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Transcript
                                </Button>
                                
                                {file.status === 'transcribed' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSummarize(file)}
                                    disabled={isSummarizing || !isOpenAIConfigured()}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600"
                                  >
                                    {isSummarizing ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Summarizing...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-4 h-4 mr-1" />
                                        Summarize
                                      </>
                                    )}
                                  </Button>
                                )}
                                
                                {file.status === 'summarized' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedFile(file);
                                      setShowSummaryDialog(true);
                                    }}
                                  >
                                    <Brain className="w-4 h-4 mr-1" />
                                    View Summary
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingFile(file)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Confirmation Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm File Upload</DialogTitle>
            <DialogDescription>
              Are you sure you want to upload this file?
            </DialogDescription>
          </DialogHeader>
          
          {uploadingFile && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {uploadingFile.type.startsWith('video/') ? (
                  <FileVideo className="w-8 h-8 text-blue-600" />
                ) : (
                  <FileAudio className="w-8 h-8 text-green-600" />
                )}
                <div>
                  <p className="font-medium">{uploadingFile.name}</p>
                  <p className="text-sm text-slate-600">
                    {formatFileSize(uploadingFile.size)} • {uploadingFile.type.startsWith('video/') ? 'Video' : 'Audio'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={confirmUpload}
                  disabled={uploadFileMutation.isPending}
                >
                  {uploadFileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload File'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transcript Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Transcript: {selectedFile?.name}
            </DialogTitle>
            <DialogDescription>
              AI-generated transcript from your audio/video file
            </DialogDescription>
          </DialogHeader>
          
          {selectedFile?.transcript && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                  {selectedFile.transcript}
                </pre>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowTranscriptDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  navigator.clipboard.writeText(selectedFile.transcript || '');
                  toast({ title: "Copied to clipboard" });
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Copy Text
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              Summary: {selectedFile?.name}
            </DialogTitle>
            <DialogDescription>
              AI-generated summary of the transcript content
            </DialogDescription>
          </DialogHeader>
          
          {selectedFile?.summary && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-slate-700">
                    {selectedFile.summary}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowSummaryDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  navigator.clipboard.writeText(selectedFile.summary || '');
                  toast({ title: "Copied to clipboard" });
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Copy Summary
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingFile} onOpenChange={() => setDeletingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFile?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingFile && deleteFileMutation.mutate(deletingFile)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TranscriptsManager; 