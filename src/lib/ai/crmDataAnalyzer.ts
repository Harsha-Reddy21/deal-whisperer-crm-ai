import { supabase } from '@/integrations/supabase/client';

export interface CRMDataContext {
  deals: any[];
  contacts: any[];
  companies: any[];
  activities: any[];
  emails: any[];
  leads: any[];
  files: any[];
  transcripts: any[];
  emailTracking: any[];
  comments: any[];
  summary: {
    totalDeals: number;
    totalContacts: number;
    totalCompanies: number;
    totalLeads: number;
    totalActivities: number;
    totalEmails: number;
    totalFiles: number;
    totalTranscripts: number;
    totalRevenue: number;
    avgDealValue: number;
    topPerformingStages: string[];
    recentActivities: number;
    conversionRate: number;
  };
}

export async function fetchCRMData(userId: string): Promise<CRMDataContext> {
  try {
    // Fetch all CRM data in parallel - including ALL data types
    const [
      dealsResult,
      contactsResult,
      companiesResult,
      activitiesResult,
      emailsResult,
      leadsResult,
      filesResult,
      transcriptsResult,
      emailTrackingResult,
      commentsResult
    ] = await Promise.all([
      supabase.from('deals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('contacts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('companies').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('activities').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('emails').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('files').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('transcripts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
      supabase.from('email_tracking').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      // Comments might not exist as a table, so we'll handle the error gracefully
      supabase.from('comments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50).then(
        result => result,
        error => ({ data: [], error: null }) // Return empty array if table doesn't exist
      )
    ]);

    const deals = dealsResult.data || [];
    const contacts = contactsResult.data || [];
    const companies = companiesResult.data || [];
    const activities = activitiesResult.data || [];
    const emails = emailsResult.data || [];
    const leads = leadsResult.data || [];
    const files = filesResult.data || [];
    const transcripts = transcriptsResult.data || [];
    const emailTracking = emailTrackingResult.data || [];
    const comments = commentsResult.data || [];

    // Calculate summary statistics
    const totalRevenue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
    const avgDealValue = deals.length > 0 ? totalRevenue / deals.length : 0;
    
    // Calculate conversion rate (deals won vs total deals)
    const wonDeals = deals.filter(deal => deal.stage === 'Won' || deal.stage === 'Closed Won').length;
    const conversionRate = deals.length > 0 ? (wonDeals / deals.length) * 100 : 0;

    // Get top performing stages
    const stageCount = deals.reduce((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topPerformingStages = Object.entries(stageCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([stage]) => stage);

    // Count recent activities (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentActivities = activities.filter(activity => 
      new Date(activity.created_at) > thirtyDaysAgo
    ).length;

    return {
      deals,
      contacts,
      companies,
      activities,
      emails,
      leads,
      files,
      transcripts,
      emailTracking,
      comments,
      summary: {
        totalDeals: deals.length,
        totalContacts: contacts.length,
        totalCompanies: companies.length,
        totalLeads: leads.length,
        totalActivities: activities.length,
        totalEmails: emails.length,
        totalFiles: files.length,
        totalTranscripts: transcripts.length,
        totalRevenue,
        avgDealValue,
        topPerformingStages,
        recentActivities,
        conversionRate
      }
    };
  } catch (error) {
    console.error('Error fetching CRM data:', error);
    // Return empty data structure on error
    return {
      deals: [],
      contacts: [],
      companies: [],
      activities: [],
      emails: [],
      leads: [],
      files: [],
      transcripts: [],
      emailTracking: [],
      comments: [],
      summary: {
        totalDeals: 0,
        totalContacts: 0,
        totalCompanies: 0,
        totalLeads: 0,
        totalActivities: 0,
        totalEmails: 0,
        totalFiles: 0,
        totalTranscripts: 0,
        totalRevenue: 0,
        avgDealValue: 0,
        topPerformingStages: [],
        recentActivities: 0,
        conversionRate: 0
      }
    };
  }
}

export function formatCRMDataForAI(data: CRMDataContext): string {
  const { deals, contacts, companies, activities, emails, leads, files, transcripts, emailTracking, comments, summary } = data;

  let context = `CRM DATABASE CONTEXT (Current User's Complete Data):

COMPREHENSIVE SUMMARY STATISTICS:
- Total Deals: ${summary.totalDeals}
- Total Contacts: ${summary.totalContacts}
- Total Companies: ${summary.totalCompanies}
- Total Leads: ${summary.totalLeads}
- Total Activities: ${summary.totalActivities}
- Total Emails: ${summary.totalEmails}
- Total Files: ${summary.totalFiles}
- Total Transcripts: ${summary.totalTranscripts}
- Total Revenue: $${summary.totalRevenue.toLocaleString()}
- Average Deal Value: $${summary.avgDealValue.toFixed(2)}
- Conversion Rate: ${summary.conversionRate.toFixed(1)}%
- Recent Activities (30 days): ${summary.recentActivities}
- Top Performing Stages: ${summary.topPerformingStages.join(', ')}

`;

  // Add deals information
  if (deals.length > 0) {
    context += `DEALS DATA (${deals.length} deals):
`;
    deals.slice(0, 10).forEach(deal => {
      context += `- ${deal.title}: $${Number(deal.value || 0).toLocaleString()} | Stage: ${deal.stage} | Probability: ${deal.probability}% | Contact: ${deal.contact_name || 'N/A'} | Company: ${deal.company || 'N/A'}
`;
    });
    context += '\n';
  }

  // Add contacts information
  if (contacts.length > 0) {
    context += `CONTACTS DATA (${contacts.length} contacts):
`;
    contacts.slice(0, 10).forEach(contact => {
      context += `- ${contact.name}: ${contact.email || 'N/A'} | Company: ${contact.company || 'N/A'} | Phone: ${contact.phone || 'N/A'} | Status: ${contact.status || 'N/A'} | Score: ${contact.score || 'N/A'}
`;
    });
    context += '\n';
  }

  // Add companies information
  if (companies.length > 0) {
    context += `COMPANIES DATA (${companies.length} companies):
`;
    companies.slice(0, 10).forEach(company => {
      context += `- ${company.name}: Industry: ${company.industry || 'N/A'} | Size: ${company.size || 'N/A'} | Revenue: $${Number(company.revenue_range || 0).toLocaleString()} | Employees: ${company.employee_count || 'N/A'} | Status: ${company.status || 'N/A'}
`;
    });
    context += '\n';
  }

  // Add leads information
  if (leads.length > 0) {
    context += `LEADS DATA (${leads.length} leads):
`;
    leads.slice(0, 10).forEach(lead => {
      context += `- ${lead.name}: ${lead.email || 'N/A'} | Company: ${lead.company || 'N/A'} | Source: ${lead.source || 'N/A'} | Score: ${lead.score || 'N/A'} | Status: ${lead.status || 'N/A'}
`;
    });
    context += '\n';
  }

  // Add recent activities
  if (activities.length > 0) {
    context += `RECENT ACTIVITIES (${Math.min(activities.length, 10)} most recent):
`;
    activities.slice(0, 10).forEach(activity => {
      context += `- ${activity.type}: ${activity.title} | Status: ${activity.status} | Priority: ${activity.priority} | Date: ${new Date(activity.created_at).toLocaleDateString()}
`;
    });
    context += '\n';
  }

  // Add email data
  if (emails.length > 0) {
    context += `EMAILS DATA (${emails.length} emails):
`;
    emails.slice(0, 5).forEach(email => {
      context += `- Subject: ${email.subject} | From: ${email.from_email} | Type: ${email.type} | Status: ${email.status} | Date: ${new Date(email.created_at).toLocaleDateString()}
`;
    });
    context += '\n';
  }

  // Add email tracking data
  if (emailTracking.length > 0) {
    context += `EMAIL TRACKING (${emailTracking.length} tracked emails):
`;
    emailTracking.slice(0, 5).forEach(email => {
      context += `- Subject: ${email.subject} | To: ${email.recipient_email} | Status: ${email.status} | Sent: ${new Date(email.created_at).toLocaleDateString()}
`;
    });
    context += '\n';
  }

  // Add files information
  if (files.length > 0) {
    context += `FILES DATA (${files.length} files):
`;
    files.slice(0, 10).forEach(file => {
      context += `- ${file.filename}: Size: ${Math.round((file.file_size || 0) / 1024)}KB | Type: ${file.mime_type || 'N/A'} | Date: ${new Date(file.created_at).toLocaleDateString()}
`;
    });
    context += '\n';
  }

  // Add transcripts information
  if (transcripts.length > 0) {
    context += `TRANSCRIPTS DATA (${transcripts.length} transcripts):
`;
    transcripts.slice(0, 5).forEach(transcript => {
      context += `- ${transcript.filename}: Status: ${transcript.status} | Type: ${transcript.file_type} | Date: ${new Date(transcript.created_at).toLocaleDateString()}
`;
      if (transcript.summary) {
        context += `  Summary: ${transcript.summary.substring(0, 200)}...
`;
      }
    });
    context += '\n';
  }

  // Add comments if available
  if (comments.length > 0) {
    context += `COMMENTS DATA (${comments.length} comments):
`;
    comments.slice(0, 5).forEach(comment => {
      context += `- ${comment.content?.substring(0, 100) || 'Comment'}... | Date: ${new Date(comment.created_at).toLocaleDateString()}
`;
    });
    context += '\n';
  }

  context += `
INSTRUCTIONS FOR AI:
- Use this comprehensive real data from the user's CRM to answer questions
- You have access to deals, contacts, companies, leads, activities, emails, files, transcripts, and more
- Provide specific insights based on actual numbers and trends across ALL data types
- Reference specific deals, contacts, companies, files, or activities when relevant
- Calculate and provide data-driven recommendations using the complete dataset
- If asked about performance, use the actual metrics provided across all areas
- When suggesting improvements, base them on patterns found in the complete data
- Always be specific and cite actual data points when possible
- Consider relationships between different data types (e.g., files attached to deals, emails related to contacts)
- Use transcript summaries and email content to provide deeper insights into customer interactions
`;

  return context;
}

export function analyzeDataTrends(data: CRMDataContext): string {
  const { deals, contacts, companies, summary } = data;
  
  let analysis = "DATA ANALYSIS INSIGHTS:\n\n";

  // Deal analysis
  if (deals.length > 0) {
    const dealsByStage = deals.reduce((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const highValueDeals = deals.filter(deal => Number(deal.value) > summary.avgDealValue).length;
    const lowProbabilityDeals = deals.filter(deal => Number(deal.probability) < 50).length;

    analysis += `DEAL PIPELINE ANALYSIS:
- Pipeline Distribution: ${Object.entries(dealsByStage).map(([stage, count]) => `${stage}: ${count}`).join(', ')}
- High-Value Deals (above average): ${highValueDeals}/${deals.length}
- Low Probability Deals (<50%): ${lowProbabilityDeals}/${deals.length}
- Pipeline Health Score: ${((highValueDeals / deals.length) * 100).toFixed(1)}%

`;
  }

  // Contact analysis
  if (contacts.length > 0) {
    const contactsByCompany = contacts.reduce((acc, contact) => {
      const company = contact.company || 'Unknown';
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCompanies = Object.entries(contactsByCompany)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    const avgContactsPerCompany = companies.length > 0 ? (contacts.length / companies.length).toFixed(1) : '0';

    analysis += `CONTACT ANALYSIS:
- Top Companies by Contact Count: ${topCompanies.map(([company, count]) => `${company}: ${count}`).join(', ')}
- Average Contacts per Company: ${avgContactsPerCompany}

`;
  }

  // Revenue analysis
  if (summary.totalRevenue > 0) {
    const revenuePerContact = summary.totalContacts > 0 ? (summary.totalRevenue / summary.totalContacts).toFixed(2) : '0.00';
    
    analysis += `REVENUE ANALYSIS:
- Total Pipeline Value: $${summary.totalRevenue.toLocaleString()}
- Average Deal Size: $${summary.avgDealValue.toFixed(2)}
- Conversion Rate: ${summary.conversionRate.toFixed(1)}%
- Revenue per Contact: $${revenuePerContact}

`;
  }

  return analysis;
} 