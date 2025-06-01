import { supabase } from '@/integrations/supabase/client';

export interface CRMDataContext {
  deals: any[];
  contacts: any[];
  companies: any[];
  activities: any[];
  emails: any[];
  leads: any[];
  summary: {
    totalDeals: number;
    totalContacts: number;
    totalCompanies: number;
    totalRevenue: number;
    avgDealValue: number;
    topPerformingStages: string[];
    recentActivities: number;
    conversionRate: number;
  };
}

export async function fetchCRMData(userId: string): Promise<CRMDataContext> {
  try {
    // Fetch all CRM data in parallel
    const [
      dealsResult,
      contactsResult,
      companiesResult,
      activitiesResult,
      emailsResult,
      leadsResult
    ] = await Promise.all([
      supabase.from('deals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('contacts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('companies').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('activities').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('email_tracking').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
    ]);

    const deals = dealsResult.data || [];
    const contacts = contactsResult.data || [];
    const companies = companiesResult.data || [];
    const activities = activitiesResult.data || [];
    const emails = emailsResult.data || [];
    const leads = leadsResult.data || [];

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
      summary: {
        totalDeals: deals.length,
        totalContacts: contacts.length,
        totalCompanies: companies.length,
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
      summary: {
        totalDeals: 0,
        totalContacts: 0,
        totalCompanies: 0,
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
  const { deals, contacts, companies, activities, emails, leads, summary } = data;

  let context = `CRM DATABASE CONTEXT (Current User's Data):

SUMMARY STATISTICS:
- Total Deals: ${summary.totalDeals}
- Total Contacts: ${summary.totalContacts}
- Total Companies: ${summary.totalCompanies}
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
      context += `- ${contact.first_name} ${contact.last_name}: ${contact.email || 'N/A'} | Company: ${contact.company || 'N/A'} | Phone: ${contact.phone || 'N/A'} | Status: ${contact.status || 'N/A'}
`;
    });
    context += '\n';
  }

  // Add companies information
  if (companies.length > 0) {
    context += `COMPANIES DATA (${companies.length} companies):
`;
    companies.slice(0, 10).forEach(company => {
      context += `- ${company.name}: Industry: ${company.industry || 'N/A'} | Size: ${company.size || 'N/A'} | Revenue: $${Number(company.revenue || 0).toLocaleString()} | Employees: ${company.employees || 'N/A'} | Status: ${company.status || 'N/A'}
`;
    });
    context += '\n';
  }

  // Add recent activities
  if (activities.length > 0) {
    context += `RECENT ACTIVITIES (${Math.min(activities.length, 5)} most recent):
`;
    activities.slice(0, 5).forEach(activity => {
      context += `- ${activity.type}: ${activity.title} | Contact: ${activity.contact_name || 'N/A'} | Date: ${new Date(activity.created_at).toLocaleDateString()}
`;
    });
    context += '\n';
  }

  // Add email tracking data
  if (emails.length > 0) {
    context += `EMAIL TRACKING (${emails.length} emails):
`;
    emails.slice(0, 5).forEach(email => {
      context += `- To: ${email.to_email} | Subject: ${email.subject} | Status: ${email.status} | Sent: ${new Date(email.created_at).toLocaleDateString()}
`;
    });
    context += '\n';
  }

  // Add leads information
  if (leads.length > 0) {
    context += `LEADS DATA (${leads.length} leads):
`;
    leads.slice(0, 10).forEach(lead => {
      context += `- ${lead.first_name} ${lead.last_name}: ${lead.email || 'N/A'} | Company: ${lead.company || 'N/A'} | Source: ${lead.source || 'N/A'} | Score: ${lead.score || 'N/A'} | Status: ${lead.status || 'N/A'}
`;
    });
    context += '\n';
  }

  context += `
INSTRUCTIONS FOR AI:
- Use this real data from the user's CRM to answer questions
- Provide specific insights based on actual numbers and trends
- Reference specific deals, contacts, or companies when relevant
- Calculate and provide data-driven recommendations
- If asked about performance, use the actual metrics provided
- When suggesting improvements, base them on the current data patterns
- Always be specific and cite actual data points when possible
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