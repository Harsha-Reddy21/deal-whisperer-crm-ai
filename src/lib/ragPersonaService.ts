import { supabase } from '@/integrations/supabase/client';

export interface InteractionHistory {
  activities: any[];
  emails: any[];
  deals: any[];
  comments: any[];
  files: any[];
  behavioralMetrics: BehavioralMetrics;
}

export interface BehavioralMetrics {
  totalInteractions: number;
  emailEngagementRate: number;
  responseTimeAvg: number;
  preferredContactTimes: string[];
  communicationFrequency: 'high' | 'medium' | 'low';
  decisionMakingSpeed: 'fast' | 'moderate' | 'slow';
  contentEngagement: {
    documentsShared: number;
    documentsViewed: number;
    meetingsScheduled: number;
    callsCompleted: number;
  };
  dealProgression: {
    averageDealCycle: number;
    stageProgression: string[];
    conversionRate: number;
  };
  interactionPatterns: {
    mostActiveHours: string[];
    mostActiveDays: string[];
    preferredChannels: string[];
  };
}

export interface PersonaContext {
  contact: any;
  interactionHistory: InteractionHistory;
  similarProfiles: any[];
  industryBenchmarks: any;
}

export class RAGPersonaService {
  /**
   * Gather comprehensive interaction history for a contact
   */
  async gatherInteractionHistory(contactId: string, userId: string): Promise<InteractionHistory> {
    try {
      // Fetch all related data in parallel
      const [activities, emails, deals, comments, files] = await Promise.all([
        this.fetchActivities(contactId, userId),
        this.fetchEmailHistory(contactId, userId),
        this.fetchDeals(contactId, userId),
        this.fetchComments(contactId, userId),
        this.fetchFiles(contactId, userId)
      ]);

      // Calculate behavioral metrics
      const behavioralMetrics = this.calculateBehavioralMetrics({
        activities,
        emails,
        deals,
        comments,
        files
      });

      return {
        activities,
        emails,
        deals,
        comments,
        files,
        behavioralMetrics
      };
    } catch (error) {
      console.error('Error gathering interaction history:', error);
      throw new Error('Failed to gather interaction history');
    }
  }

  /**
   * Fetch activities related to the contact
   */
  private async fetchActivities(contactId: string, userId: string) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch email tracking history
   */
  private async fetchEmailHistory(contactId: string, userId: string) {
    const { data, error } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch deals associated with the contact
   */
  private async fetchDeals(contactId: string, userId: string) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch comments/notes about the contact
   */
  private async fetchComments(contactId: string, userId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch files shared with the contact
   */
  private async fetchFiles(contactId: string, userId: string) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Calculate behavioral metrics from interaction data
   */
  private calculateBehavioralMetrics(data: any): BehavioralMetrics {
    const { activities, emails, deals, comments, files } = data;

    // Calculate email engagement rate
    const emailEngagementRate = emails.length > 0 
      ? (emails.filter((e: any) => e.opened_at || e.clicked_at || e.replied_at).length / emails.length) * 100
      : 0;

    // Calculate response time (simplified - based on activity frequency)
    const responseTimeAvg = this.calculateAverageResponseTime(activities);

    // Determine communication frequency
    const totalInteractions = activities.length + emails.length + comments.length;
    const communicationFrequency = this.determineCommunicationFrequency(totalInteractions, activities);

    // Analyze decision making speed based on deal progression
    const decisionMakingSpeed = this.analyzeDecisionMakingSpeed(deals);

    // Extract interaction patterns
    const interactionPatterns = this.extractInteractionPatterns(activities, emails);

    // Calculate deal progression metrics
    const dealProgression = this.calculateDealProgression(deals);

    return {
      totalInteractions,
      emailEngagementRate,
      responseTimeAvg,
      preferredContactTimes: interactionPatterns.mostActiveHours,
      communicationFrequency,
      decisionMakingSpeed,
      contentEngagement: {
        documentsShared: files.length,
        documentsViewed: files.filter((f: any) => f.mime_type?.includes('pdf') || f.mime_type?.includes('document')).length,
        meetingsScheduled: activities.filter((a: any) => a.type === 'meeting').length,
        callsCompleted: activities.filter((a: any) => a.type === 'call' && a.status === 'completed').length,
      },
      dealProgression,
      interactionPatterns
    };
  }

  private calculateAverageResponseTime(activities: any[]): number {
    if (activities.length < 2) return 0;
    
    const sortedActivities = activities.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let totalTime = 0;
    let intervals = 0;
    
    for (let i = 1; i < sortedActivities.length; i++) {
      const timeDiff = new Date(sortedActivities[i].created_at).getTime() - 
                      new Date(sortedActivities[i-1].created_at).getTime();
      totalTime += timeDiff;
      intervals++;
    }
    
    return intervals > 0 ? Math.round(totalTime / intervals / (1000 * 60 * 60)) : 0; // hours
  }

  private determineCommunicationFrequency(totalInteractions: number, activities: any[]): 'high' | 'medium' | 'low' {
    const daysSinceFirstActivity = activities.length > 0 
      ? Math.max(1, Math.ceil((Date.now() - new Date(activities[activities.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    
    const interactionsPerDay = totalInteractions / daysSinceFirstActivity;
    
    if (interactionsPerDay >= 1) return 'high';
    if (interactionsPerDay >= 0.3) return 'medium';
    return 'low';
  }

  private analyzeDecisionMakingSpeed(deals: any[]): 'fast' | 'moderate' | 'slow' {
    if (deals.length === 0) return 'moderate';
    
    const completedDeals = deals.filter(d => d.stage === 'Closing' || d.probability >= 90);
    if (completedDeals.length === 0) return 'moderate';
    
    const averageCycle = completedDeals.reduce((sum, deal) => {
      const cycleTime = new Date(deal.updated_at).getTime() - new Date(deal.created_at).getTime();
      return sum + (cycleTime / (1000 * 60 * 60 * 24)); // days
    }, 0) / completedDeals.length;
    
    if (averageCycle <= 30) return 'fast';
    if (averageCycle <= 90) return 'moderate';
    return 'slow';
  }

  private extractInteractionPatterns(activities: any[], emails: any[]) {
    const allInteractions = [...activities, ...emails];
    
    // Extract hours and days from timestamps
    const hours = allInteractions.map(i => new Date(i.created_at).getHours());
    const days = allInteractions.map(i => new Date(i.created_at).getDay());
    
    // Find most common hours (business hours focus)
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const mostActiveHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
    
    // Find most common days
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = days.reduce((acc, day) => {
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const mostActiveDays = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => dayNames[parseInt(day)]);
    
    // Determine preferred channels based on activity types
    const channelCounts = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const preferredChannels = Object.entries(channelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([channel]) => channel);
    
    return {
      mostActiveHours,
      mostActiveDays,
      preferredChannels
    };
  }

  private calculateDealProgression(deals: any[]) {
    if (deals.length === 0) {
      return {
        averageDealCycle: 0,
        stageProgression: [],
        conversionRate: 0
      };
    }
    
    const completedDeals = deals.filter(d => d.stage === 'Closing');
    const averageDealCycle = completedDeals.length > 0 
      ? completedDeals.reduce((sum, deal) => {
          const cycleTime = new Date(deal.updated_at).getTime() - new Date(deal.created_at).getTime();
          return sum + (cycleTime / (1000 * 60 * 60 * 24));
        }, 0) / completedDeals.length
      : 0;
    
    const stageProgression = deals.map(d => d.stage).filter(Boolean);
    const conversionRate = deals.length > 0 ? (completedDeals.length / deals.length) * 100 : 0;
    
    return {
      averageDealCycle: Math.round(averageDealCycle),
      stageProgression,
      conversionRate: Math.round(conversionRate)
    };
  }

  /**
   * Find similar customer profiles for pattern matching
   */
  async findSimilarProfiles(contact: any, userId: string): Promise<any[]> {
    try {
      // Find contacts with similar characteristics
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .neq('id', contact.id)
        .or(`company.ilike.%${contact.company}%,title.ilike.%${contact.title}%`)
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding similar profiles:', error);
      return [];
    }
  }

  /**
   * Generate enhanced persona context for RAG
   */
  async generatePersonaContext(contactId: string, userId: string): Promise<PersonaContext> {
    try {
      // Get contact details
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', userId)
        .single();

      if (contactError) throw contactError;

      // Gather comprehensive interaction history
      const interactionHistory = await this.gatherInteractionHistory(contactId, userId);

      // Find similar profiles
      const similarProfiles = await this.findSimilarProfiles(contact, userId);

      // Get industry benchmarks (simplified - could be enhanced with external data)
      const industryBenchmarks = this.getIndustryBenchmarks(contact.company);

      return {
        contact,
        interactionHistory,
        similarProfiles,
        industryBenchmarks
      };
    } catch (error) {
      console.error('Error generating persona context:', error);
      throw new Error('Failed to generate persona context');
    }
  }

  private getIndustryBenchmarks(company: string | null) {
    // Simplified industry benchmarks - in a real implementation, 
    // this could fetch from external APIs or a comprehensive database
    const defaultBenchmarks = {
      averageEmailEngagement: 25,
      averageResponseTime: 24,
      averageDealCycle: 60,
      commonPainPoints: ['Cost optimization', 'Efficiency improvement', 'Digital transformation'],
      preferredChannels: ['email', 'phone', 'meeting']
    };

    // Could enhance this with industry-specific data based on company name/domain
    return defaultBenchmarks;
  }

  /**
   * Create a comprehensive prompt for RAG-enhanced persona generation
   */
  createRAGPrompt(context: PersonaContext): string {
    const { contact, interactionHistory, similarProfiles, industryBenchmarks } = context;
    const { behavioralMetrics } = interactionHistory;

    return `You are an expert sales psychologist with access to comprehensive interaction data. Create a detailed customer persona based on the following rich context:

CONTACT INFORMATION:
Name: ${contact.name}
Company: ${contact.company}
Title: ${contact.title}
Email: ${contact.email}
Phone: ${contact.phone}
Status: ${contact.status}
Current Score: ${contact.score}

COMPREHENSIVE INTERACTION HISTORY:
Total Interactions: ${behavioralMetrics.totalInteractions}
Email Engagement Rate: ${behavioralMetrics.emailEngagementRate.toFixed(1)}%
Average Response Time: ${behavioralMetrics.responseTimeAvg} hours
Communication Frequency: ${behavioralMetrics.communicationFrequency}
Decision Making Speed: ${behavioralMetrics.decisionMakingSpeed}

Content Engagement:
- Documents Shared: ${behavioralMetrics.contentEngagement.documentsShared}
- Meetings Scheduled: ${behavioralMetrics.contentEngagement.meetingsScheduled}
- Calls Completed: ${behavioralMetrics.contentEngagement.callsCompleted}

Deal Progression:
- Average Deal Cycle: ${behavioralMetrics.dealProgression.averageDealCycle} days
- Conversion Rate: ${behavioralMetrics.dealProgression.conversionRate}%
- Stage History: ${behavioralMetrics.dealProgression.stageProgression.join(', ')}

Interaction Patterns:
- Most Active Hours: ${behavioralMetrics.interactionPatterns.mostActiveHours.join(', ')}
- Most Active Days: ${behavioralMetrics.interactionPatterns.mostActiveDays.join(', ')}
- Preferred Channels: ${behavioralMetrics.interactionPatterns.preferredChannels.join(', ')}

RECENT ACTIVITIES (Last 5):
${interactionHistory.activities.slice(0, 5).map(a => 
  `- ${a.type}: ${a.subject} (${a.status}) - ${new Date(a.created_at).toLocaleDateString()}`
).join('\n')}

EMAIL ENGAGEMENT PATTERNS:
${interactionHistory.emails.slice(0, 3).map(e => 
  `- ${e.subject}: Opened: ${e.opened_at ? 'Yes' : 'No'}, Clicked: ${e.clicked_at ? 'Yes' : 'No'}, Replied: ${e.replied_at ? 'Yes' : 'No'}`
).join('\n')}

SIMILAR CUSTOMER PROFILES:
${similarProfiles.map(p => 
  `- ${p.name} (${p.company}): ${p.title} - Score: ${p.score}`
).join('\n')}

INDUSTRY BENCHMARKS:
- Average Email Engagement: ${industryBenchmarks.averageEmailEngagement}%
- Average Response Time: ${industryBenchmarks.averageResponseTime} hours
- Average Deal Cycle: ${industryBenchmarks.averageDealCycle} days

Based on this comprehensive behavioral data and interaction patterns, generate a detailed customer persona including:

1. name: Professional persona name based on behavioral patterns
2. role: Confirmed or inferred role based on interaction patterns
3. company_size: Estimated based on engagement patterns and company data
4. industry: Industry classification based on company and interaction patterns
5. pain_points: Specific pain points derived from interaction history and similar profiles
6. communication_style: Style based on actual communication patterns observed
7. decision_making_style: Style based on deal progression and response patterns
8. preferred_channels: Channels based on actual usage patterns
9. buying_motivations: Motivations inferred from engagement and deal history
10. objections_likely: Likely objections based on interaction patterns and similar profiles
11. recommended_approach: Personalized approach based on all behavioral data

Format your response as a JSON object with these exact fields. Base your analysis on the actual behavioral data provided, not just demographic assumptions.`;
  }
}

export const ragPersonaService = new RAGPersonaService(); 