import { makeOpenAIRequest, isOpenAIConfigured } from './config';
import type { OpenAIMessage } from './types';

export interface TranscriptionRequest {
  audioFile: File;
  language?: string;
  prompt?: string;
}

export interface TranscriptionResponse {
  success: boolean;
  transcript: string;
  language?: string;
  duration?: number;
  confidence?: number;
}

export interface SummarizationRequest {
  transcript: string;
  fileName: string;
  summaryType?: 'brief' | 'detailed' | 'action-items' | 'key-points';
  context?: string;
}

export interface SummarizationResponse {
  success: boolean;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  topics: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

// Transcribe audio/video file using OpenAI Whisper API
export async function transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // In a real implementation, this would use OpenAI's Whisper API
    // For now, we'll simulate the transcription process
    
    // Simulate processing time based on file size
    const processingTime = Math.min(request.audioFile.size / (1024 * 1024) * 1000, 10000);
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Generate a realistic mock transcript based on file name and type
    const mockTranscript = generateMockTranscript(request.audioFile.name);

    return {
      success: true,
      transcript: mockTranscript,
      language: request.language || 'en',
      duration: Math.floor(request.audioFile.size / (1024 * 50)), // Rough estimate
      confidence: 0.95
    };

  } catch (error) {
    console.error('Error transcribing audio:', error);
    return {
      success: false,
      transcript: '',
      confidence: 0
    };
  }
}

// Summarize transcript using OpenAI GPT
export async function summarizeTranscript(request: SummarizationRequest): Promise<SummarizationResponse> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const prompt = `
You are an expert at analyzing and summarizing business conversations, meetings, and presentations. 
Please analyze the following transcript from "${request.fileName}" and provide a comprehensive summary.

TRANSCRIPT:
${request.transcript}

CONTEXT: ${request.context || 'Business meeting or presentation'}

Please provide a detailed analysis in the following JSON format:

{
  "summary": "A comprehensive summary of the main content and discussions (3-4 paragraphs)",
  "keyPoints": ["List of 5-8 most important points discussed"],
  "actionItems": ["List of specific action items, decisions, or next steps mentioned"],
  "topics": ["List of main topics or themes covered"],
  "sentiment": "overall sentiment: positive, neutral, or negative"
}

Guidelines:
- Focus on business-relevant information
- Identify concrete decisions, commitments, and next steps
- Highlight important insights, concerns, or opportunities
- Extract specific names, dates, numbers, and deadlines when mentioned
- Maintain professional tone and clarity
- Ensure action items are specific and actionable

Return only valid JSON without any additional text or formatting.
`;

    const messages: OpenAIMessage[] = [
      {
        role: "system",
        content: "You are an expert business analyst specializing in meeting transcription analysis and summarization. Provide accurate, actionable insights in valid JSON format."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const response = await makeOpenAIRequest(messages, {
      model: "gpt-4",
      temperature: 0.3,
      maxTokens: 2000
    });

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const analysisData = JSON.parse(response);

    return {
      success: true,
      summary: analysisData.summary,
      keyPoints: analysisData.keyPoints || [],
      actionItems: analysisData.actionItems || [],
      topics: analysisData.topics || [],
      sentiment: analysisData.sentiment || 'neutral',
      confidence: 0.9
    };

  } catch (error) {
    console.error('Error summarizing transcript:', error);
    
    // Fallback summary
    return {
      success: false,
      summary: `Summary of ${request.fileName}: This transcript contains business discussions and conversations. A detailed analysis could not be completed at this time.`,
      keyPoints: ['Transcript analysis incomplete'],
      actionItems: ['Review transcript manually'],
      topics: ['Business discussion'],
      sentiment: 'neutral',
      confidence: 0.1
    };
  }
}

// Generate realistic mock transcript based on file name and context
function generateMockTranscript(fileName: string): string {
  const businessTopics = [
    'quarterly business review',
    'product development meeting',
    'customer feedback session',
    'sales strategy discussion',
    'team planning meeting',
    'project status update',
    'client presentation',
    'training session'
  ];

  const randomTopic = businessTopics[Math.floor(Math.random() * businessTopics.length)];

  return `This is a simulated transcript for ${fileName}. In a production environment, this would be generated using OpenAI's Whisper API.

[Meeting Start - ${new Date().toLocaleTimeString()}]

Speaker 1: Good morning everyone, thank you for joining today's ${randomTopic}. Let's start by reviewing our agenda and key objectives for this session.

Speaker 2: Absolutely. I've prepared the quarterly metrics and we're seeing some interesting trends in customer engagement. Our conversion rates have improved by 15% compared to last quarter.

Speaker 1: That's excellent news. Can you walk us through the specific factors that contributed to this improvement?

Speaker 2: Certainly. We implemented the new customer onboarding process, improved our follow-up sequences, and the sales team has been more proactive with lead qualification. The AI-powered insights have also helped us identify high-value prospects more effectively.

Speaker 3: I'd like to add that the customer feedback has been overwhelmingly positive. We're seeing higher satisfaction scores and reduced churn rates. The new features we launched last month are being well-received.

Speaker 1: Great to hear. What are our priorities for the next quarter?

Speaker 2: We need to focus on scaling our successful strategies, expanding into new market segments, and continuing to optimize our sales processes. I recommend we allocate additional resources to the high-performing channels.

Speaker 3: I agree. We should also consider investing in additional training for the team and exploring new technology solutions that could further improve our efficiency.

Speaker 1: Excellent points. Let's schedule follow-up meetings to dive deeper into these initiatives. I'll send out action items and next steps by end of day.

[Meeting End - ${new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString()}]

Key decisions made:
- Approved budget allocation for high-performing channels
- Scheduled team training sessions for next month
- Committed to quarterly review of new technology solutions
- Established monthly check-ins for progress tracking

This transcript demonstrates typical business meeting content with strategic discussions, performance metrics, and actionable next steps.`;
}

// Extract audio from video file (for video files)
export async function extractAudioFromVideo(videoFile: File): Promise<File> {
  // In a real implementation, this would use FFmpeg or similar to extract audio
  // For now, we'll return the original file as if it's audio
  return new Promise((resolve) => {
    setTimeout(() => {
      // Create a mock audio file from the video
      const audioFile = new File([videoFile], videoFile.name.replace(/\.[^/.]+$/, '.mp3'), {
        type: 'audio/mpeg'
      });
      resolve(audioFile);
    }, 1000);
  });
}

// Validate file type for transcription
export function validateTranscriptionFile(file: File): { valid: boolean; error?: string } {
  const validAudioTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm'
  ];
  
  const validVideoTypes = [
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm', 'video/mkv'
  ];

  const allValidTypes = [...validAudioTypes, ...validVideoTypes];
  
  if (!allValidTypes.some(type => file.type.includes(type.split('/')[1]))) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload an audio or video file.'
    };
  }

  // Check file size (max 100MB for transcription)
  if (file.size > 100 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File too large. Please upload a file smaller than 100MB.'
    };
  }

  return { valid: true };
}

// Get estimated transcription time
export function getEstimatedTranscriptionTime(file: File): number {
  // Rough estimate: 1MB = ~1 minute of audio, processing takes ~10% of audio length
  const estimatedAudioMinutes = file.size / (1024 * 1024);
  const processingMinutes = estimatedAudioMinutes * 0.1;
  return Math.max(1, Math.ceil(processingMinutes));
} 