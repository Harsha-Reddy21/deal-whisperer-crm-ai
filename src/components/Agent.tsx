import { useState } from "react";
import { OpenAI } from "openai";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const tools = [
  {
    type: "function" as const,
    function: {
      name: "summarizeEmails",
      description: "Reads & summarizes recent unread emails, identifies critical ones, and generates replies",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "critical_deal",
      description: "Identifies deals with no activity in the last 7 days, finds the most critical one, and generates a follow-up email",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getcontactfromlinkedin",
      description: "Searches for a contact on LinkedIn based on user query, adds them to contacts, creates a deal, and sends an email",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for finding the contact on LinkedIn (name, job title, company, etc.)"
          }
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_deal",
      description: "Creates a new deal for an existing contact and generates a follow-up email",
      parameters: {
        type: "object",
        properties: {
          contact_name: {
            type: "string",
            description: "Name of the existing contact to create a deal for"
          },
          deal_title: {
            type: "string",
            description: "Title of the deal to be created"
          },
          deal_value: {
            type: "number",
            description: "Value of the deal in dollars (optional)"
          },
          deal_stage: {
            type: "string",
            description: "Stage of the deal (e.g., Prospecting, Proposal, Negotiation, Closing) (optional)"
          }
        },
        required: ["contact_name", "deal_title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_contact",
      description: "Creates a new contact in the CRM system",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Full name of the contact"
          },
          email: {
            type: "string",
            description: "Email address of the contact"
          },
          company: {
            type: "string",
            description: "Company name of the contact"
          },
          title: {
            type: "string",
            description: "Job title of the contact (optional)"
          },
          phone: {
            type: "string",
            description: "Phone number of the contact (optional)"
          },
          status: {
            type: "string",
            description: "Status of the lead (e.g., 'New Lead', 'Hot Lead', 'Cold Lead') (optional)"
          }
        },
        required: ["name", "email", "company"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_lead",
      description: "Creates a new lead in the CRM system and sets up initial lead score and status",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Full name of the lead"
          },
          email: {
            type: "string",
            description: "Email address of the lead"
          },
          company: {
            type: "string",
            description: "Company name of the lead"
          },
          title: {
            type: "string",
            description: "Job title of the lead (optional)"
          },
          phone: {
            type: "string",
            description: "Phone number of the lead (optional)"
          },
          source: {
            type: "string",
            description: "Lead source (e.g., 'Website', 'Referral', 'LinkedIn', 'Conference') (optional)"
          },
          score: {
            type: "number",
            description: "Initial lead score from 0-100 (optional)"
          },
          notes: {
            type: "string",
            description: "Initial notes or context about the lead (optional)"
          }
        },
        required: ["name", "email", "company"],
      },
    },
  },
];

// Simulated tool implementations
async function runTool(toolName: string, args: any): Promise<string> {
  console.log(`[TOOL CALL] Running tool: ${toolName} with args:`, args);
  
  let result = "";
  
  if (toolName === "summarizeEmails") {
    result = await summarize_unread_message();
  }
  
  if (toolName === "critical_deal") {
    result = await get_critical_deals();
  }
  
  if (toolName === "getcontactfromlinkedin") {
    result = await find_linkedin_contact(args.query);
  }
  
  if (toolName === "create_deal") {
    result = await create_deal(
      args.contact_name, 
      args.deal_title, 
      args.deal_value, 
      args.deal_stage
    );
  }
  
  if (toolName === "create_contact") {
    result = await create_contact_function(
      args.name,
      args.email,
      args.company,
      args.title,
      args.phone,
      args.status
    );
  }
  
  if (toolName === "create_lead") {
    result = await create_lead_function(
      args.name,
      args.email,
      args.company,
      args.title,
      args.phone,
      args.source,
      args.score,
      args.notes
    );
  }
  
  console.log(`[TOOL RESULT] ${toolName} result (first 100 chars): ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
  return result;
}

// Function to create a new deal for an existing contact
async function create_deal(
  contactName: string, 
  dealTitle: string, 
  dealValue?: number, 
  dealStage?: string
) {
  console.log(`[CREATE DEAL] Starting deal creation: "${dealTitle}" for contact "${contactName}"`);
  try {
    // Get current user ID
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    if (!userId) {
      console.log("[CREATE DEAL] Error: User not authenticated");
      return "Error: User not authenticated. Please sign in to create deals.";
    }
    
    // Step 1: Find the contact by name
    console.log("[CREATE DEAL] Searching for contact in Supabase");
    const { data: contacts, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .ilike("name", `%${contactName}%`)
      .eq("user_id", userId);
      
    if (contactError) {
      console.error("[CREATE DEAL] Error searching for contact:", contactError);
      return `Error finding contact: ${contactError.message}`;
    }
    
    if (!contacts || contacts.length === 0) {
      console.log("[CREATE DEAL] No contact found with name:", contactName);
      return `No contact found with name "${contactName}". Please check the name or create the contact first.`;
    }
    
    // If multiple contacts found, use the first one
    let selectedContact = contacts[0];
    if (contacts.length > 1) {
      console.log(`[CREATE DEAL] Found ${contacts.length} contacts matching "${contactName}". Using the first match:`, selectedContact);
    } else {
      console.log("[CREATE DEAL] Found exact contact match:", selectedContact);
    }
    
    // Step 2: Create the deal
    const now = new Date().toISOString();
    const dealValueToUse = dealValue || Math.floor(Math.random() * 50000) + 10000; // Random value if not provided
    const dealStageToUse = dealStage || "Proposal"; // Default stage if not provided
    
    console.log("[CREATE DEAL] Creating deal with values:", {
      title: dealTitle,
      value: dealValueToUse,
      stage: dealStageToUse,
      contact: selectedContact.name,
      contact_id: selectedContact.id
    });
    
    const { data: dealData, error: dealError } = await supabase
      .from("deals")
      .insert({
        title: dealTitle,
        value: dealValueToUse,
        stage: dealStageToUse,
        company: selectedContact.company,
        contact_id: selectedContact.id,
        contact_name: selectedContact.name,
        created_at: now,
        updated_at: now,
        last_activity: now,
        user_id: userId,
        probability: dealStageToUse === "Proposal" ? 50 : 
                    dealStageToUse === "Negotiation" ? 70 : 
                    dealStageToUse === "Closing" ? 90 : 30, // Set probability based on stage
      })
      .select()
      .single();
      
    if (dealError) {
      console.error("[CREATE DEAL] Error creating deal in Supabase:", dealError);
      return `Error creating deal: ${dealError.message}`;
    }
    
    console.log("[CREATE DEAL] Deal created successfully:", dealData);
    const dealId = dealData.id;
    
    // Step 3: Generate a follow-up email for this deal
    console.log("[CREATE DEAL] Generating follow-up email");
    const emailResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a sales assistant that helps generate professional and personalized deal-related emails. Generate an appropriate email based on the contact's profile and the deal details." 
        },
        { 
          role: "user", 
          content: `Please generate a professional email for this new deal:
          
Contact:
Name: ${selectedContact.name}
Title: ${selectedContact.title || "Unknown"}
Company: ${selectedContact.company || "Unknown"}
Email: ${selectedContact.email || "Unknown"}
          
Deal:
Title: ${dealTitle}
Value: $${dealValueToUse}
Stage: ${dealStageToUse}

Please provide the email in JSON format with the following structure:
{
  "to": "${selectedContact.email || 'recipient@example.com'}",
  "subject": "A personalized subject line related to the deal",
  "body": "The generated email body that discusses the deal in a professional manner appropriate for the current stage"
}

Make the email personalized, professional, and relevant to the deal stage.
IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const emailResult = emailResponse.choices[0].message.content || "";
    console.log("[CREATE DEAL] Generated email (first 100 chars):", emailResult.substring(0, 100));
    
    // Clean and parse the email
    const cleanedEmail = cleanJsonString(emailResult);
    let parsedEmail;
    try {
      parsedEmail = JSON.parse(cleanedEmail);
      console.log("[CREATE DEAL] Successfully parsed email JSON");
    } catch (e) {
      console.error("[CREATE DEAL] Error parsing deal email:", e);
      return `Deal created successfully, but could not generate email. Deal ID: ${dealId}`;
    }
    
    // Step 4: Store the email in Supabase
    console.log("[CREATE DEAL] Storing email in Supabase");
    const { data: emailData, error: emailError } = await supabase
      .from("email_tracking")
      .insert({
        subject: parsedEmail.subject,
        user_id: userId,
        contact_id: selectedContact.id,
        deal_id: dealId,
        sent_at: now,
        created_at: now,
        email_id: crypto.randomUUID(), // Generate a unique ID
      });
      
    if (emailError) {
      console.error("[CREATE DEAL] Error storing email in Supabase:", emailError);
      return `Deal created successfully, but could not save email. Deal ID: ${dealId}. Error: ${emailError.message}`;
    }
    
    console.log("[CREATE DEAL] Email stored successfully");
    
    // Step 5: Return a comprehensive response
    const response = `
Deal Created Successfully:
Title: ${dealTitle}
Contact: ${selectedContact.name}
Company: ${selectedContact.company || "Not specified"}
Value: $${dealValueToUse}
Stage: ${dealStageToUse}
Probability: ${dealData.probability}%
Deal ID: ${dealId}

Follow-up Email Generated:
To: ${parsedEmail.to}
Subject: ${parsedEmail.subject}
Body:
${parsedEmail.body}

Status: Deal created and follow-up email recorded in the system.
`;

    console.log("[CREATE DEAL] Deal creation process completed successfully");
    return response;
  } catch (error) {
    console.error("[CREATE DEAL] Error in create_deal:", error);
    return `Error creating deal: ${error}`;
  }
}

// Function to search LinkedIn for contacts, add to contacts DB, create deal, and send email
async function find_linkedin_contact(query: string) {
  console.log(`Searching for LinkedIn contact with query: ${query}`);
  try {
    // Step 1: Use AI to generate a simulated LinkedIn search result
    // In a real implementation, this would interact with LinkedIn's API
    const searchResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a LinkedIn search assistant. Generate a realistic LinkedIn search result for the given query. Make the result realistic and detailed with current positions and companies. Your response must be valid JSON without code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Generate a realistic LinkedIn search result for this query: "${query}"

Please provide 3 potential contacts in JSON format with the following structure:
{
  "results": [
    {
      "name": "Full Name",
      "title": "Current Job Title",
      "company": "Current Company",
      "location": "City, Country",
      "industry": "Industry",
      "email": "professional email address",
      "phone": "phone number (optional)",
      "linkedin_url": "linkedin profile URL",
      "experience_years": number of years of experience,
      "skills": ["skill1", "skill2", "skill3"],
      "education": "Highest education"
    }
  ]
}

Make sure the data is realistic for the query. Include realistic email addresses following common patterns.
IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const searchResult = searchResponse.choices[0].message.content || "";
    console.log("LinkedIn search results:", searchResult);
    
    // Clean and parse the result
    const cleanedResult = cleanJsonString(searchResult);
    let parsedResults;
    try {
      parsedResults = JSON.parse(cleanedResult);
    } catch (e) {
      console.error("Error parsing LinkedIn search results:", e);
      return `Error: Could not parse LinkedIn search results. ${searchResult}`;
    }
    
    if (!parsedResults.results || parsedResults.results.length === 0) {
      return "No contacts found matching your search criteria.";
    }
    
    // Step 2: Use the first contact from the results
    const selectedContact = parsedResults.results[0];
    console.log(`Selected first LinkedIn contact from results: ${selectedContact.name} at ${selectedContact.company}`);
    
    // Step 3: Add the contact to the contacts table in Supabase
    const now = new Date().toISOString();
    
    // Get current user ID
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    if (!userId) {
      return "Error: User not authenticated. Please sign in to add contacts.";
    }
    
    const { data: contactData, error: contactError } = await supabase
      .from("contacts")
      .insert({
        name: selectedContact.name,
        email: selectedContact.email,
        phone: selectedContact.phone || null,
        company: selectedContact.company,
        title: selectedContact.title,
        created_at: now,
        updated_at: now,
        user_id: userId,
        status: "Hot Lead",
        score: 70, // Default lead score
      })
      .select()
      .single();
      
    if (contactError) {
      console.error("Error adding contact to Supabase:", contactError);
      return `Error adding contact to database: ${contactError.message}`;
    }
    
    console.log("Contact added successfully:", contactData);
    const contactId = contactData.id;
    
    // Step 4: Create a new deal for this contact
    const dealTitle = `${selectedContact.company} - ${query} Opportunity`;
    const dealValue = Math.floor(Math.random() * 50000) + 10000; // Random value between 10k and 60k
    
    const { data: dealData, error: dealError } = await supabase
      .from("deals")
      .insert({
        title: dealTitle,
        value: dealValue,
        stage: "Proposal",
        company: selectedContact.company,
        contact_id: contactId,
        contact_name: selectedContact.name,
        created_at: now,
        updated_at: now,
        last_activity: now,
        user_id: userId,
        probability: 20, // Initial probability
      })
      .select()
      .single();
      
    if (dealError) {
      console.error("Error creating deal in Supabase:", dealError);
      return `Error creating deal: ${dealError.message}. Contact was still added to database.`;
    }
    
    console.log("Deal created successfully:", dealData);
    const dealId = dealData.id;
    
    // Step 5: Generate an introduction email for this contact
    const emailResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a sales assistant that helps generate professional and personalized introduction emails. Generate an appropriate email based on the contact's profile and the business opportunity." 
        },
        { 
          role: "user", 
          content: `Please generate a professional introduction email for this new contact:
          
Contact:
Name: ${selectedContact.name}
Title: ${selectedContact.title}
Company: ${selectedContact.company}
Industry: ${selectedContact.industry}
Skills: ${selectedContact.skills.join(", ")}
          
Deal:
Title: ${dealTitle}
Value: $${dealValue}
Stage: Proposal

Original search query: "${query}"

Please provide the email in JSON format with the following structure:
{
  "to": "${selectedContact.email}",
  "subject": "A personalized and engaging subject line",
  "body": "The generated email body that introduces yourself, mentions relevant aspects of their profile and experience, and suggests a potential opportunity to collaborate"
}

Make the email personalized, professional, and engaging. Avoid generic templates.
IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const emailResult = emailResponse.choices[0].message.content || "";
    console.log("Generated introduction email:", emailResult);
    
    // Clean and parse the email
    const cleanedEmail = cleanJsonString(emailResult);
    let parsedEmail;
    try {
      parsedEmail = JSON.parse(cleanedEmail);
    } catch (e) {
      console.error("Error parsing introduction email:", e);
      return `Error: Could not parse introduction email. ${emailResult}`;
    }
    
    // Step 6: Store the email in Supabase
    const { data: emailData, error: emailError } = await supabase
      .from("email_tracking")
      .insert({
        subject: parsedEmail.subject,
        user_id: userId,
        contact_id: contactId,
        deal_id: dealId,
        sent_at: now,
        created_at: now,
        email_id: crypto.randomUUID(), // Generate a unique ID
      });
      
    if (emailError) {
      console.error("Error storing email in Supabase:", emailError);
      return `Error sending email: ${emailError.message}. Contact and deal were still created.`;
    }
    
    // Step 7: Return a comprehensive response
    return `
LinkedIn Contact Found and Added:
Name: ${selectedContact.name}
Title: ${selectedContact.title}
Company: ${selectedContact.company}
Email: ${selectedContact.email}
Phone: ${selectedContact.phone || "Not available"}

Deal Created:
Title: ${dealTitle}
Value: $${dealValue}
Stage: Proposal
Probability: 20%

Introduction Email Sent:
To: ${parsedEmail.to}
Subject: ${parsedEmail.subject}
Body:
${parsedEmail.body}

Status: Contact added to database, deal created, and introduction email recorded.
`;
  } catch (error) {
    console.error("Error in find_linkedin_contact:", error);
    return `Error processing LinkedIn contact: ${error}`;
  }
}

// Helper function to clean JSON strings that might contain markdown formatting
function cleanJsonString(jsonString) {
  // Remove markdown code block markers
  let cleaned = jsonString.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/```/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // If the result still doesn't look like JSON, try to extract JSON from the string
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const jsonMatch = cleaned.match(/({[\s\S]*})/);
    if (jsonMatch && jsonMatch[1]) {
      cleaned = jsonMatch[1];
    }
  }
  
  return cleaned;
}

// Function to identify and follow up on deals with no recent activity
async function get_critical_deals() {
  console.log("Fetching deals with no recent activity...");
  try {
    // Step 1: Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 2);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    
    console.log(`Looking for deals with no activity since ${sevenDaysAgoISO}`);
    
    // Step 2: Fetch deals from Supabase that haven't had activity in the last 7 days
    const { data: staleDeals, error } = await supabase
      .from("deals")
      .select("*")
      .lt("last_activity", sevenDaysAgoISO)
      .order("value", { ascending: false }); // Order by deal value to prioritize higher value deals
    
    if (error) {
      console.error("Error fetching stale deals:", error);
      return `Error fetching stale deals: ${error.message}`;
    }
    
    if (!staleDeals || staleDeals.length === 0) {
      console.log("No stale deals found");
      return "No deals with inactive status found in the last 2 days.";
    }
    
    console.log(`Found ${staleDeals.length} stale deals`);
    
    // Step 3: Format deals for LLM
    const dealsText = staleDeals.map(deal => 
      `Deal ID: ${deal.id}
       Title: ${deal.title || "No title"}
       Value: $${deal.value || 0}
       Stage: ${deal.stage || "Unknown"}
       Company: ${deal.company || "Unknown"}
       Contact: ${deal.contact_name || "Unknown"}
       Last Activity: ${deal.last_activity || "Never"}
       Next Step: ${deal.next_step || "None"}
       Probability: ${deal.probability || 0}%
       -------------------`
    ).join("\n\n");
    
    // Step 4: Call LLM to identify the most critical deal
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a sales assistant. Analyze the deals with no recent activity and identify the single most critical one that needs immediate follow-up. A critical deal might be high-value, in an advanced stage, or close to closing. Your response must be valid JSON without code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Here are deals with no activity in the last 2 days. Please analyze them and identify the SINGLE most critical deal that needs immediate follow-up:\n\n${dealsText}

Please format your response as a JSON object with the following structure:
{
  "summary": "A brief summary of all stale deals",
  "total_stale_deals": number of stale deals,
  "most_critical_deal": {
    "deal_id": "the deal ID of the most critical deal",
    "title": "the deal title",
    "value": "the deal value",
    "reason": "why this deal is critical and needs immediate follow-up",
    "suggested_action": "what action should be taken for this deal"
  }
}

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const analysisResult = analysisResponse.choices[0].message.content || "";
    console.log("Deal analysis:", analysisResult);
    
    // Clean the result to handle markdown formatting
    const cleanedResult = cleanJsonString(analysisResult);
    console.log("Cleaned analysis result:", cleanedResult);
    
    let parsedAnalysis;
    try {
      // Parse the JSON response
      parsedAnalysis = JSON.parse(cleanedResult);
    } catch (e) {
      console.error("Error parsing analysis result:", e);
      return `Error: Could not parse the analysis result. ${analysisResult}`;
    }
    
    if (!parsedAnalysis.most_critical_deal || !parsedAnalysis.most_critical_deal.deal_id) {
      return `No critical deals identified.\n\n${JSON.stringify(parsedAnalysis, null, 2)}`;
    }
    
    // Step 5: Get the critical deal details
    const criticalDealId = parsedAnalysis.most_critical_deal.deal_id;
    const criticalDeal = staleDeals.find(deal => deal.id === criticalDealId);
    
    if (!criticalDeal) {
      return `Error: Could not find the critical deal with ID ${criticalDealId}`;
    }
    
    // Step 6: Generate a follow-up email for the critical deal
    const emailResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a sales assistant that helps generate professional and effective follow-up emails for stale deals. Generate an appropriate follow-up email for the critical deal. Your response must be valid JSON without code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Please generate a professional follow-up email for this critical deal that has had no activity in the last 7 days:
          
Deal ID: ${criticalDeal.id}
Title: ${criticalDeal.title || "No title"}
Value: $${criticalDeal.value || 0}
Stage: ${criticalDeal.stage || "Unknown"}
Company: ${criticalDeal.company || "Unknown"}
Contact Name: ${criticalDeal.contact_name || "Unknown"}
Last Activity: ${criticalDeal.last_activity || "Never"}
Next Step: ${criticalDeal.next_step || "None"}
Probability: ${criticalDeal.probability || 0}%
Reason for follow-up: ${parsedAnalysis.most_critical_deal.reason}
Suggested action: ${parsedAnalysis.most_critical_deal.suggested_action}

Please provide the follow-up email in JSON format with the following structure:
{
  "to": "the contact's email (use their name + @company.com if not available)",
  "subject": "Follow-up on [Deal Title]",
  "body": "The generated email body that effectively follows up on this deal based on its status and details"
}

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const generatedEmail = emailResponse.choices[0].message.content || "";
    console.log("Generated follow-up email:", generatedEmail);
    
    // Clean the result to handle markdown formatting
    const cleanedEmail = cleanJsonString(generatedEmail);
    console.log("Cleaned email:", cleanedEmail);
    
    let parsedEmail;
    try {
      // Parse the JSON response
      parsedEmail = JSON.parse(cleanedEmail);
    } catch (e) {
      console.error("Error parsing generated email:", e);
      return `Error: Could not parse the generated email. ${generatedEmail}`;
    }
    
    // Step 7: Store the follow-up email in Supabase
    const now = new Date().toISOString();
    const { data, error: insertError } = await supabase
      .from("email_tracking")
      .insert({
        subject: parsedEmail.subject,
        user_id: "a0954a90-39f5-4a83-bcf6-15201789dbd5", // Replace with actual user ID in production
        contact_id: criticalDeal.contact_id,
        deal_id: criticalDeal.id,
        sent_at: now,
        created_at: now,
        email_id: crypto.randomUUID(), // Generate a unique ID
      });
      
    if (insertError) {
      console.error("Error storing follow-up email in Supabase:", insertError);
      return `Error sending follow-up email: ${insertError.message}`;
    }
    
    // Step 8: Update the deal's last_activity field
    const { error: updateError } = await supabase
      .from("deals")
      .update({ 
        last_activity: now,
        next_step: parsedAnalysis.most_critical_deal.suggested_action
      })
      .eq("id", criticalDealId);
      
    if (updateError) {
      console.error("Error updating deal:", updateError);
      return `Warning: Follow-up email sent but could not update deal: ${updateError.message}`;
    }
    
    // Step 9: Return a comprehensive response
    return `
Deal Analysis Summary:
${parsedAnalysis.summary}

Most Critical Deal Identified:
Title: ${parsedAnalysis.most_critical_deal.title}
Deal ID: ${parsedAnalysis.most_critical_deal.deal_id}
Value: ${parsedAnalysis.most_critical_deal.value}
Reason: ${parsedAnalysis.most_critical_deal.reason}
Suggested Action: ${parsedAnalysis.most_critical_deal.suggested_action}

Follow-Up Email Generated and Sent:
To: ${parsedEmail.to}
Subject: ${parsedEmail.subject}
Body: 
${parsedEmail.body}

Status: Follow-up email stored in database and deal updated with new activity timestamp and next step.
`;
  } catch (error) {
    console.error("Error in get_critical_deals:", error);
    return `Error analyzing deals: ${error}`;
  }
}

// All-in-one function to handle emails: fetch, analyze, reply, and update
async function summarize_unread_message() {
  console.log("Fetching unread emails from Supabase...");
  try {
    // Step 1: Fetch unread emails from Supabase
    const { data: emailTracking, error } = await supabase
      .from("email_tracking")
      .select("*")
      .is("opened_at", null)  // Unread emails have null opened_at
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching unread emails:", error);
      return `Error fetching unread emails: ${error.message}`;
    }

    if (!emailTracking || emailTracking.length === 0) {
      console.log("No unread emails found");
      return "No unread emails found";
    }

    console.log(`Found ${emailTracking.length} unread emails`);

    // Step 2: Format emails for LLM
    const emailsText = emailTracking.map(email => 
      `From: ${email.user_id}
       Subject: ${email.subject || "No subject"}
       Date: ${email.created_at}
       Status: Unread
       Email ID: ${email.email_id}
       Contact ID: ${email.contact_id || "N/A"}
       Deal ID: ${email.deal_id || "N/A"}
       -------------------`
    ).join("\n\n");

    // Step 3: Call LLM to identify critical emails
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an email assistant. Analyze the unread emails and identify the most important/critical one that needs an immediate response. A critical email might be time-sensitive, from an important client, related to a critical issue, or requires immediate attention. Your response must be valid JSON without code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Here are my unread emails. Please analyze them and identify the SINGLE most critical email that needs an immediate response:\n\n${emailsText}

Please format your response as a JSON object with the following structure:
{
  "summary": "A brief summary of all unread emails",
  "total_unread": number of unread emails,
  "most_critical_email": {
    "email_id": "the email ID of the most critical email",
    "subject": "the email subject",
    "reason": "why this email is critical and needs immediate response"
  }
}

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });

    const analysisResult = analysisResponse.choices[0].message.content || "";
    console.log("Email analysis:", analysisResult);
    
    // Clean the result to handle markdown formatting
    const cleanedResult = cleanJsonString(analysisResult);
    console.log("Cleaned analysis result:", cleanedResult);
    
    let parsedAnalysis;
    try {
      // Parse the JSON response
      parsedAnalysis = JSON.parse(cleanedResult);
    } catch (e) {
      console.error("Error parsing analysis result:", e);
      return `Error: Could not parse the analysis result. ${analysisResult}`;
    }
    
    if (!parsedAnalysis.most_critical_email || !parsedAnalysis.most_critical_email.email_id) {
      return `No critical emails identified.\n\n${JSON.stringify(parsedAnalysis, null, 2)}`;
    }
    
    // Step 4: Get the critical email details
    const criticalEmailId = parsedAnalysis.most_critical_email.email_id;
    const criticalEmail = emailTracking.find(email => email.email_id === criticalEmailId);
    
    if (!criticalEmail) {
      return `Error: Could not find the critical email with ID ${criticalEmailId}`;
    }
    
    // Step 5: Generate a reply to the critical email
    const replyResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an email assistant that helps generate professional and concise email replies. Generate an appropriate reply to the critical email. Your response must be valid JSON without code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Please generate a professional reply to this critical email:
          
Subject: ${criticalEmail.subject || "No subject"}
From: ${criticalEmail.user_id}
Email ID: ${criticalEmail.email_id}
Reason for importance: ${parsedAnalysis.most_critical_email.reason}

Please provide the reply in JSON format with the following structure:
{
  "to": "recipient email address (use the sender's address)",
  "subject": "Re: original subject",
  "body": "The generated email body that addresses the critical nature of this email"
}

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const generatedReply = replyResponse.choices[0].message.content || "";
    console.log("Generated reply:", generatedReply);
    
    // Clean the result to handle markdown formatting
    const cleanedReply = cleanJsonString(generatedReply);
    console.log("Cleaned reply:", cleanedReply);
    
    let parsedReply;
    try {
      // Parse the JSON response
      parsedReply = JSON.parse(cleanedReply);
    } catch (e) {
      console.error("Error parsing generated reply:", e);
      return `Error: Could not parse the generated reply. ${generatedReply}`;
    }
    
    // Step 6: Store the reply in Supabase
    const now = new Date().toISOString();
    const { data, error: insertError } = await supabase
      .from("email_tracking")
      .insert({
        subject: parsedReply.subject,
        user_id: criticalEmail.user_id,
        contact_id: criticalEmail.contact_id,
        deal_id: criticalEmail.deal_id,
        sent_at: now,
        created_at: now,
        email_id: crypto.randomUUID(), // Generate a unique ID
      });
      
    if (insertError) {
      console.error("Error storing email reply in Supabase:", insertError);
      return `Error sending email reply: ${insertError.message}`;
    }
    
    // Step 7: Mark the original email as replied
    const { error: updateError } = await supabase
      .from("email_tracking")
      .update({ 
        replied_at: now,
        opened_at: now // Also mark as read
      })
      .eq("email_id", criticalEmailId);
      
    if (updateError) {
      console.error("Error updating original email:", updateError);
      return `Warning: Email reply sent but could not mark original as replied: ${updateError.message}`;
    }
    
    // Step 8: Return a comprehensive response
    return `
Email Analysis Summary:
${parsedAnalysis.summary}

Most Critical Email Identified:
Subject: ${parsedAnalysis.most_critical_email.subject}
Email ID: ${parsedAnalysis.most_critical_email.email_id}
Reason: ${parsedAnalysis.most_critical_email.reason}

Reply Generated and Sent:
To: ${parsedReply.to}
Subject: ${parsedReply.subject}
Body: 
${parsedReply.body}

Status: Email reply stored in database and original email marked as replied.
`;
  } catch (error) {
    console.error("Error in summarize_unread_message:", error);
    return `Error analyzing emails: ${error}`;
  }
}

// Function to create a new contact in the CRM system
async function create_contact_function(
  name: string,
  email: string,
  company: string,
  title?: string,
  phone?: string,
  status?: string
) {
  console.log(`[CREATE CONTACT] Starting contact creation for: ${name} at ${company}`);
  try {
    // Get current user ID
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    if (!userId) {
      console.log("[CREATE CONTACT] Error: User not authenticated");
      return "Error: User not authenticated. Please sign in to create contacts.";
    }
    
    // Check if contact with similar email already exists
    console.log("[CREATE CONTACT] Checking for existing contact with email:", email);
    const { data: existingContacts, error: searchError } = await supabase
      .from("contacts")
      .select("*")
      .eq("email", email)
      .eq("user_id", userId);
      
    if (searchError) {
      console.error("[CREATE CONTACT] Error searching for existing contact:", searchError);
      return `Error checking for existing contact: ${searchError.message}`;
    }
    
    if (existingContacts && existingContacts.length > 0) {
      console.log("[CREATE CONTACT] Contact with this email already exists:", existingContacts[0]);
      return `A contact with email "${email}" already exists (${existingContacts[0].name}). Use the existing contact instead.`;
    }
    
    // Create the new contact
    const now = new Date().toISOString();
    const statusToUse = status || "Hot Lead"; // Default status
    
    console.log("[CREATE CONTACT] Creating new contact with values:", {
      name,
      email,
      company,
      title: title || "Not specified",
      phone: phone || "Not specified",
      status: statusToUse
    });
    
    const { data: contactData, error: contactError } = await supabase
      .from("contacts")
      .insert({
        name: name,
        email: email,
        phone: phone || null,
        company: company,
        title: title || null,
        created_at: now,
        updated_at: now,
        user_id: userId,
        status: statusToUse,
        score: 70, // Default lead score
      })
      .select()
      .single();
      
    if (contactError) {
      console.error("[CREATE CONTACT] Error adding contact to Supabase:", contactError);
      return `Error creating contact: ${contactError.message}`;
    }
    
    console.log("[CREATE CONTACT] Contact created successfully:", contactData);
    
    // Generate a welcome/intro email
    console.log("[CREATE CONTACT] Generating welcome email");
    const emailResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a sales assistant that helps generate professional welcome emails for new contacts. The email should be friendly, professional, and set the stage for future communications." 
        },
        { 
          role: "user", 
          content: `Please generate a professional welcome email for this new contact:
          
Contact:
Name: ${name}
Title: ${title || "Unknown"}
Company: ${company}
Email: ${email}
          
Please provide the email in JSON format with the following structure:
{
  "to": "${email}",
  "subject": "Welcome to our network - Excited to connect",
  "body": "The generated email body that welcomes the contact, mentions how you found them, and suggests a next step (like a call or meeting)"
}

Make the email personalized, professional, and not too sales-focused at this early stage.
IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const emailResult = emailResponse.choices[0].message.content || "";
    console.log("[CREATE CONTACT] Generated welcome email (first 100 chars):", emailResult.substring(0, 100));
    
    // Clean and parse the email
    const cleanedEmail = cleanJsonString(emailResult);
    let parsedEmail;
    try {
      parsedEmail = JSON.parse(cleanedEmail);
      console.log("[CREATE CONTACT] Successfully parsed email JSON");
    } catch (e) {
      console.error("[CREATE CONTACT] Error parsing welcome email:", e);
      return `Contact created successfully, but could not generate welcome email. Contact ID: ${contactData.id}`;
    }
    
    // Store the email in Supabase
    console.log("[CREATE CONTACT] Storing welcome email in Supabase");
    const { data: emailData, error: emailError } = await supabase
      .from("email_tracking")
      .insert({
        subject: parsedEmail.subject,
        user_id: userId,
        contact_id: contactData.id,
        sent_at: now,
        created_at: now,
        email_id: crypto.randomUUID(), // Generate a unique ID
      });
      
    if (emailError) {
      console.error("[CREATE CONTACT] Error storing email in Supabase:", emailError);
      return `Contact created successfully, but could not save welcome email. Contact ID: ${contactData.id}. Error: ${emailError.message}`;
    }
    
    console.log("[CREATE CONTACT] Welcome email stored successfully");
    
    // Return a comprehensive response
    const response = `
Contact Created Successfully:
Name: ${name}
Email: ${email}
Company: ${company}
Title: ${title || "Not specified"}
Phone: ${phone || "Not specified"}
Status: ${statusToUse}
Contact ID: ${contactData.id}

Welcome Email Generated:
To: ${parsedEmail.to}
Subject: ${parsedEmail.subject}
Body:
${parsedEmail.body}

Status: Contact created and welcome email recorded in the system.
`;

    console.log("[CREATE CONTACT] Contact creation process completed successfully");
    return response;
  } catch (error) {
    console.error("[CREATE CONTACT] Error in create_contact_function:", error);
    return `Error creating contact: ${error}`;
  }
}

// Function to create a new lead in the CRM system
async function create_lead_function(
  name: string,
  email: string,
  company: string,
  title?: string,
  phone?: string,
  source?: string,
  score?: number,
  notes?: string
) {
  console.log(`[CREATE LEAD] Starting lead creation for: ${name} at ${company}`);
  try {
    // Get current user ID
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    if (!userId) {
      console.log("[CREATE LEAD] Error: User not authenticated");
      return "Error: User not authenticated. Please sign in to create leads.";
    }
    
    // Check if lead/contact with similar email already exists
    console.log("[CREATE LEAD] Checking for existing contact with email:", email);
    const { data: existingContacts, error: searchError } = await supabase
      .from("contacts")
      .select("*")
      .eq("email", email)
      .eq("user_id", userId);
      
    if (searchError) {
      console.error("[CREATE LEAD] Error searching for existing contact:", searchError);
      return `Error checking for existing lead: ${searchError.message}`;
    }
    
    if (existingContacts && existingContacts.length > 0) {
      console.log("[CREATE LEAD] Lead with this email already exists:", existingContacts[0]);
      return `A lead/contact with email "${email}" already exists (${existingContacts[0].name}). Update the existing lead instead.`;
    }
    
    // Create the new lead
    const now = new Date().toISOString();
    const sourceToUse = source || "Manual Entry";
    const scoreToUse = score || 50; // Default score if not provided
    
    console.log("[CREATE LEAD] Creating new lead with values:", {
      name,
      email,
      company,
      title: title || "Not specified",
      phone: phone || "Not specified",
      source: sourceToUse,
      score: scoreToUse,
      notes: notes || "None provided"
    });
    
    const { data: leadData, error: leadError } = await supabase
      .from("contacts")
      .insert({
        name: name,
        email: email,
        phone: phone || null,
        company: company,
        title: title || null,
        created_at: now,
        updated_at: now,
        user_id: userId,
        status: "Hot Lead",
        score: scoreToUse
        
      })
      .select()
      .single();
      
    if (leadError) {
      console.error("[CREATE LEAD] Error adding lead to Supabase:", leadError);
      return `Error creating lead: ${leadError.message}`;
    }
    
    console.log("[CREATE LEAD] Lead created successfully:", leadData);
    
    // Generate a lead qualification/nurture email
    console.log("[CREATE LEAD] Generating lead qualification email");
    const emailResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a sales assistant that helps generate professional lead qualification emails. The email should be designed to qualify the lead and move them further down the sales funnel." 
        },
        { 
          role: "user", 
          content: `Please generate a professional lead qualification email for this new lead:
          
Lead:
Name: ${name}
Title: ${title || "Unknown"}
Company: ${company}
Email: ${email}
Source: ${sourceToUse}
Score: ${scoreToUse}/100
Notes: ${notes || "None provided"}
          
Please provide the email in JSON format with the following structure:
{
  "to": "${email}",
  "subject": "Following up on your interest in our solutions",
  "body": "The generated email body that qualifies the lead by asking about their needs, timeline, budget, or other qualifying questions appropriate for a first outreach"
}

Make the email personalized, professional, and focused on qualifying the lead rather than selling.
IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const emailResult = emailResponse.choices[0].message.content || "";
    console.log("[CREATE LEAD] Generated qualification email (first 100 chars):", emailResult.substring(0, 100));
    
    // Clean and parse the email
    const cleanedEmail = cleanJsonString(emailResult);
    let parsedEmail;
    try {
      parsedEmail = JSON.parse(cleanedEmail);
      console.log("[CREATE LEAD] Successfully parsed email JSON");
    } catch (e) {
      console.error("[CREATE LEAD] Error parsing qualification email:", e);
      return `Lead created successfully, but could not generate qualification email. Lead ID: ${leadData.id}`;
    }
    
    // Store the email in Supabase
    console.log("[CREATE LEAD] Storing qualification email in Supabase");
    const { data: emailData, error: emailError } = await supabase
      .from("email_tracking")
      .insert({
        subject: parsedEmail.subject,
        user_id: userId,
        contact_id: leadData.id,
        sent_at: now,
        created_at: now,
        email_id: crypto.randomUUID(), // Generate a unique ID
      });
      
    if (emailError) {
      console.error("[CREATE LEAD] Error storing email in Supabase:", emailError);
      return `Lead created successfully, but could not save qualification email. Lead ID: ${leadData.id}. Error: ${emailError.message}`;
    }
    
    console.log("[CREATE LEAD] Qualification email stored successfully");
    
    // Create a task to follow up with the lead
    console.log("[CREATE LEAD] Creating follow-up task");
    const followupDate = new Date();
    followupDate.setDate(followupDate.getDate() + 3); // Follow up in 3 days
    
    const { data: taskData, error: taskError } = await supabase
      .from("activities")
      .insert({
        subject: `Follow up with ${name} from ${company}`,
        description: `Initial follow-up after qualification email. Lead score: ${scoreToUse}/100. Source: ${sourceToUse}. ${notes ? `Notes: ${notes}` : ''}`,
        type: "Task",
        status: "Pending",
        due_date: followupDate.toISOString(),
        contact_id: leadData.id,
        user_id: userId,
        created_at: now,
      });
      
    if (taskError) {
      console.error("[CREATE LEAD] Error creating follow-up task:", taskError);
      console.log("[CREATE LEAD] Proceeding without task creation");
    } else {
      console.log("[CREATE LEAD] Follow-up task created successfully");
    }
    
    // Return a comprehensive response
    const response = `
Lead Created Successfully:
Name: ${name}
Email: ${email}
Company: ${company}
Title: ${title || "Not specified"}
Phone: ${phone || "Not specified"}
Source: ${sourceToUse}
Score: ${scoreToUse}/100
Notes: ${notes || "None provided"}
Lead ID: ${leadData.id}

Qualification Email Generated:
To: ${parsedEmail.to}
Subject: ${parsedEmail.subject}
Body:
${parsedEmail.body}

${taskError ? "Note: Could not create follow-up task due to an error." : "Follow-up task created for " + followupDate.toDateString()}

Status: Lead created and qualification email recorded in the system.
`;

    console.log("[CREATE LEAD] Lead creation process completed successfully");
    return response;
  } catch (error) {
    console.error("[CREATE LEAD] Error in create_lead_function:", error);
    return `Error creating lead: ${error}`;
  }
}

// Function to auto-generate missing contact information (email, company)
async function generateMissingContactInfo(name: string) {
  console.log(`[GENERATE INFO] Generating missing contact information for: ${name}`);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an assistant that helps generate realistic contact information based on a person's name. Generate information that is realistic and plausible, but fictitious. Return only JSON without any code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Generate realistic but fictitious contact information for a person named "${name}".
          
Please generate the following in JSON format:
{
  "email": "a realistic business email address for this person",
  "company": "a realistic company name where this person might work",
  "title": "a realistic job title for this person",
  "phone": "a realistic phone number (optional)"
}

Choose a realistic domain for the email that makes sense for the company.
IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const result = response.choices[0].message.content || "";
    console.log("[GENERATE INFO] Generated information:", result);
    
    // Clean and parse the result
    const cleanedResult = cleanJsonString(result);
    let parsedInfo;
    try {
      parsedInfo = JSON.parse(cleanedResult);
      console.log("[GENERATE INFO] Successfully parsed contact info JSON");
      return parsedInfo;
    } catch (e) {
      console.error("[GENERATE INFO] Error parsing generated contact info:", e);
      return null;
    }
  } catch (error) {
    console.error("[GENERATE INFO] Error generating contact information:", error);
    return null;
  }
}

export default function Agent() {
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("Proposal");
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [pendingDealInfo, setPendingDealInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;

    setLoading(true);
    setChatLog("");
    let currentMessages: any[] = [
      { role: "user", content: userPrompt },
    ];

    console.log("[CONVERSATION START] User prompt:", userPrompt);

    try {
      // Check if user is asking to summarize emails
      if (userPrompt.toLowerCase().includes("summarize") && 
          userPrompt.toLowerCase().includes("email")) {
        console.log("[DIRECT ROUTE] Detected email summarization request");
        setChatLog("Analyzing unread emails and generating replies to critical ones...");
        const summary = await summarize_unread_message();
        setChatLog(prev => prev + "\n\n" + summary);
        setLoading(false);
        return;
      }
      
      // Check if user is asking to find critical deals
      if ((userPrompt.toLowerCase().includes("critical") || userPrompt.toLowerCase().includes("stale")) && 
          userPrompt.toLowerCase().includes("deal")) {
        console.log("[DIRECT ROUTE] Detected critical deals request");
        setChatLog("Analyzing stale deals and generating follow-up emails...");
        const dealAnalysis = await get_critical_deals();
        setChatLog(prev => prev + "\n\n" + dealAnalysis);
        setLoading(false);
        return;
      }
      
      // Check if user is asking to find LinkedIn contacts
      if (userPrompt.toLowerCase().includes("linkedin") || 
          (userPrompt.toLowerCase().includes("find") && userPrompt.toLowerCase().includes("contact"))) {
        console.log("[DIRECT ROUTE] Detected LinkedIn contact search");
        setChatLog("Searching for LinkedIn contacts based on your query...");
        const contactResult = await find_linkedin_contact(userPrompt);
        setChatLog(prev => prev + "\n\n" + contactResult);
        setLoading(false);
        return;
      }
      
      // Check if user is asking to create a deal
      if (userPrompt.toLowerCase().includes("create") && 
          userPrompt.toLowerCase().includes("deal")) {
        console.log("[DIRECT ROUTE] Detected deal creation request");
        
        // Enhanced information extraction
        // Try to extract contact name, email, company and deal title from the prompt
        const contactMatch = userPrompt.match(/contact\s*:?\s*([^,\.]+)/i) || 
                           userPrompt.match(/for\s+([^,\.]+)/i) ||
                           userPrompt.match(/with\s+([^,\.]+)/i) ||
                           userPrompt.match(/name\s*:?\s*([^,\.]+)/i);
                           
        const titleMatch = userPrompt.match(/title\s*:?\s*([^,\.]+)/i) || 
                          userPrompt.match(/deal\s+for\s+([^,\.]+)/i) ||
                          userPrompt.match(/deal\s+called\s+['"]?([^'",.]+)['"]?/i) ||
                          userPrompt.match(/called\s+['"]?([^'",.]+)['"]?/i);
                          
        const emailMatch = userPrompt.match(/email\s*:?\s*([^\s,\.]+@[^\s,\.]+\.[^\s,\.]+)/i);
        const companyMatch = userPrompt.match(/company\s*:?\s*([^,\.]+)/i) ||
                            userPrompt.match(/at\s+([^,\.]+)/i);
                            
        const valueMatch = userPrompt.match(/value\s*:?\s*\$?(\d+[,\d]*(?:\.\d+)?)/i) ||
                           userPrompt.match(/worth\s*:?\s*\$?(\d+[,\d]*(?:\.\d+)?)/i);
                           
        const stageMatch = userPrompt.match(/stage\s*:?\s*([^,\.]+)/i);
        
        const extractedContactName = contactMatch ? contactMatch[1].trim() : "";
        const extractedDealTitle = titleMatch ? titleMatch[1].trim() : "";
        const extractedEmail = emailMatch ? emailMatch[1].trim() : "";
        const extractedCompany = companyMatch ? companyMatch[1].trim() : "";
        const extractedValue = valueMatch ? parseFloat(valueMatch[1].replace(/,/g, '')) : undefined;
        const extractedStage = stageMatch ? stageMatch[1].trim() : undefined;
        
        console.log("[DEAL EXTRACTION] Contact:", extractedContactName || contactName);
        console.log("[DEAL EXTRACTION] Email:", extractedEmail || contactEmail);
        console.log("[DEAL EXTRACTION] Company:", extractedCompany || contactCompany);
        console.log("[DEAL EXTRACTION] Title:", extractedDealTitle || dealTitle);
        console.log("[DEAL EXTRACTION] Value:", extractedValue || dealValue);
        console.log("[DEAL EXTRACTION] Stage:", extractedStage || dealStage);
        
        // Update state with extracted values
        if (extractedContactName) setContactName(extractedContactName);
        if (extractedEmail) setContactEmail(extractedEmail);
        if (extractedCompany) setContactCompany(extractedCompany);
        if (extractedDealTitle) setDealTitle(extractedDealTitle);
        if (extractedValue) setDealValue(extractedValue.toString());
        if (extractedStage) setDealStage(extractedStage);
        
        // Check if we have enough information to create a deal
        if (!extractedContactName && !contactName) {
          setChatLog("Please specify a contact name for the deal.");
          setLoading(false);
          return;
        }
        
        if (!extractedDealTitle && !dealTitle) {
          setChatLog("Please specify a title for the deal.");
          setLoading(false);
          return;
        }
        
        // Check if contact exists before creating deal
        await checkContactAndCreateDeal(
          extractedContactName || contactName, 
          extractedDealTitle || dealTitle,
          extractedValue || (dealValue ? parseFloat(dealValue) : undefined),
          extractedStage || dealStage
        );
        
        return;
      }

      // Use function calling with looping to solve complex tasks
      let maxIterations = 10; // Prevent infinite loops
      let iterationCount = 0;
      let finalAnswer = false;
      
      console.log("[FUNCTION CALLING ROUTE] Starting iterative function calling");
      setChatLog("Processing your request...");

      while (!finalAnswer && iterationCount < maxIterations) {
        iterationCount++;
        console.log(`[ITERATION ${iterationCount}] Starting iteration`);
        setChatLog(prev => prev + `\n\n[Iteration ${iterationCount}]`);
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            ...currentMessages,
            // Add a system message to guide the model on when to stop looping
            { 
              role: "system", 
              content: "Use available tools to solve the user's request. When you have the final answer or have completed the requested task, respond directly without calling any more tools. If the task requires multiple steps, continue using tools until you have all the information needed." 
            }
          ],
          tools,
          tool_choice: "auto",
        });

        const message = response.choices[0].message;
        console.log(`[RESPONSE] Has tool calls: ${!!message.tool_calls}, Tool calls count: ${message.tool_calls ? message.tool_calls.length : 0}`);

        if (message.tool_calls && message.tool_calls.length > 0) {
          // Model wants to call a tool - continue looping
          console.log(`[TOOLS REQUESTED] ${message.tool_calls.length} tools requested in this iteration`);
          
          for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);

            console.log(`[EXECUTING TOOL] ${toolName} with args:`, toolArgs);
            setChatLog(prev => prev + `\n[Assistant is using: ${toolName}]`);

            // Run the tool
            const toolResult = await runTool(toolName, toolArgs);

            // Append assistant tool_call message
            currentMessages.push({
              role: "assistant",
              content: null,
              tool_calls: [toolCall]
            });

            // Append tool response message
            currentMessages.push({
              role: "tool",
              name: toolName,
              content: toolResult,
              tool_call_id: toolCall.id,
            });

            setChatLog(prev => prev + `\n[${toolName} result summary]: ${toolResult.substring(0, 100)}${toolResult.length > 100 ? '...' : ''}`);
          }
        } else {
          // Normal assistant message without tool call - we've reached a final answer
          finalAnswer = true;
          console.log(`[FINAL ANSWER] Reached final answer after ${iterationCount} iterations`);
          console.log("[FINAL ANSWER CONTENT]", message.content);
          
          setChatLog(prev => prev + `\n\n[Final Answer]: ${message.content || ""}`);
          
          // Add the final answer to the conversation history
          currentMessages.push({
            role: "assistant",
            content: message.content
          });
        }
      }

      // If we reached max iterations without a final answer
      if (!finalAnswer) {
        console.log(`[MAX ITERATIONS] Reached maximum iterations (${maxIterations}) without final answer`);
        setChatLog(prev => prev + "\n\n[System]: Reached maximum number of iterations without a final answer. Here's what I've found so far.");
        
        // Generate a summary of findings
        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            ...currentMessages,
            { 
              role: "system", 
              content: "Please provide a concise summary of what you've found so far, based on all tool results." 
            }
          ]
        });
        
        console.log("[FALLBACK SUMMARY]", summaryResponse.choices[0].message.content);
        setChatLog(prev => prev + `\n\n${summaryResponse.choices[0].message.content || "No summary available."}`);
      }
    } catch (err) {
      console.error("[ERROR]", err);
      setChatLog(prev => prev + `\n\n[Error]: ${err}`);
    } finally {
      console.log("[CONVERSATION END] Request completed");
      setLoading(false);
    }
  };

  // Function to create a new contact
  const createContact = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactCompany.trim()) {
      setChatLog("Please enter contact name, email, and company.");
      return;
    }
    
    setLoading(true);
    setChatLog(`Creating a new contact: ${contactName}...`);
    
    try {
      // Get current user ID
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (!userId) {
        setChatLog("Error: User not authenticated. Please sign in to add contacts.");
        setLoading(false);
        return;
      }
      
      const now = new Date().toISOString();
      
      // Add contact to database
      const { data: contactData, error: contactError } = await supabase
        .from("contacts")
        .insert({
          name: contactName,
          email: contactEmail,
          phone: contactPhone || null,
          company: contactCompany,
          title: contactTitle || null,
          created_at: now,
          updated_at: now,
          user_id: userId,
          status: "Hot Lead",
          score: 70, // Default lead score
        })
        .select()
        .single();
        
      if (contactError) {
        console.error("Error adding contact to Supabase:", contactError);
        setChatLog(`Error adding contact to database: ${contactError.message}`);
        setLoading(false);
        return;
      }
      
      setChatLog(`Contact created successfully:
Name: ${contactData.name}
Email: ${contactData.email}
Company: ${contactData.company}
Title: ${contactData.title || "Not specified"}
Phone: ${contactData.phone || "Not specified"}
Status: ${contactData.status}
      `);
      
      // If there's pending deal info, proceed to create the deal
      if (pendingDealInfo) {
        const dealResult = await create_deal(
          contactData.name,
          pendingDealInfo.title,
          pendingDealInfo.value,
          pendingDealInfo.stage
        );
        
        setChatLog(prev => prev + "\n\n" + dealResult);
        setPendingDealInfo(null);
      }
      
      // Reset contact form
      setShowContactForm(false);
      
    } catch (error) {
      console.error("Error in createContact:", error);
      setChatLog(`Error creating contact: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to check if contact exists before creating a deal
  const checkContactAndCreateDeal = async (contactName: string, dealTitle: string, dealValue?: number, dealStage?: string) => {
    console.log("[CHECK CONTACT] Starting contact check for:", contactName);
    setLoading(true);
    setChatLog(`Checking if contact "${contactName}" exists...`);
    
    try {
      // Get current user ID
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (!userId) {
        console.log("[CHECK CONTACT] Error: User not authenticated");
        setChatLog("Error: User not authenticated. Please sign in to create deals.");
        setLoading(false);
        return;
      }
      
      // Check if contact exists
      console.log("[CHECK CONTACT] Querying Supabase for contact");
      const { data: contacts, error: contactError } = await supabase
        .from("contacts")
        .select("*")
        .ilike("name", `%${contactName}%`)
        .eq("user_id", userId);
        
      if (contactError) {
        console.error("[CHECK CONTACT] Error searching for contact:", contactError);
        setChatLog(`Error finding contact: ${contactError.message}`);
        setLoading(false);
        return;
      }
      
      console.log("[CHECK CONTACT] Contact search results count:", contacts?.length || 0);
      
      if (!contacts || contacts.length === 0) {
        // Contact doesn't exist - automatically create the contact first
        console.log("[CHECK CONTACT] No contact found, automatically creating contact first");
        setChatLog(`Contact "${contactName}" doesn't exist. Creating contact automatically...`);
        
        // Check if we have contact information in state
        if (contactEmail && contactCompany) {
          // We have enough info to create the contact automatically
          console.log("[CHECK CONTACT] Creating contact with existing information");
          
          // Create the contact using the create_contact_function
          const contactResult = await create_contact_function(
            contactName,
            contactEmail,
            contactCompany,
            contactTitle,
            contactPhone,
            "Hot Lead"
          );
          
          setChatLog(prev => prev + "\n\n" + contactResult);
          
          // Now create the deal - extract the contact ID from the result if possible
          console.log("[CHECK CONTACT] Contact created, now creating deal");
          const contactIdMatch = contactResult.match(/Contact ID: ([a-f0-9-]+)/i);
          const contactId = contactIdMatch ? contactIdMatch[1] : null;
          
          if (contactId) {
            // We have the contact ID, create the deal
            const dealResult = await create_deal(contactName, dealTitle, dealValue, dealStage);
            setChatLog(prev => prev + "\n\n" + dealResult);
          } else {
            // Fallback to searching for the contact again
            setTimeout(async () => {
              console.log("[CHECK CONTACT] Searching for newly created contact");
              const { data: newContacts } = await supabase
                .from("contacts")
                .select("*")
                .eq("name", contactName)
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(1);
                
              if (newContacts && newContacts.length > 0) {
                console.log("[CHECK CONTACT] Found newly created contact, creating deal");
                const dealResult = await create_deal(contactName, dealTitle, dealValue, dealStage);
                setChatLog(prev => prev + "\n\n" + dealResult);
              } else {
                setChatLog(prev => prev + "\n\nContact created but could not automatically create deal. Please try creating the deal again.");
              }
            }, 1000); // Wait 1 second for database to update
          }
        } else {
          // We need more contact information - try to auto-generate it
          console.log("[CHECK CONTACT] Missing contact information, attempting to auto-generate");
          setChatLog(prev => prev + "\n\nMissing contact information. Generating it automatically...");
          
          const generatedInfo = await generateMissingContactInfo(contactName);
          
          if (generatedInfo) {
            console.log("[CHECK CONTACT] Successfully generated contact information:", generatedInfo);
            
            // Update state with generated info
            if (!contactEmail && generatedInfo.email) setContactEmail(generatedInfo.email);
            if (!contactCompany && generatedInfo.company) setContactCompany(generatedInfo.company);
            if (!contactTitle && generatedInfo.title) setContactTitle(generatedInfo.title);
            if (!contactPhone && generatedInfo.phone) setContactPhone(generatedInfo.phone);
            
            setChatLog(prev => prev + `\nGenerated contact information:
Email: ${generatedInfo.email}
Company: ${generatedInfo.company}
Title: ${generatedInfo.title}
Phone: ${generatedInfo.phone || "Not provided"}
            `);
            
            // Create the contact using the generated information
            const contactResult = await create_contact_function(
              contactName,
              generatedInfo.email,
              generatedInfo.company,
              generatedInfo.title,
              generatedInfo.phone,
              "Hot Lead"
            );
            
            setChatLog(prev => prev + "\n\n" + contactResult);
            
            // Now create the deal
            console.log("[CHECK CONTACT] Contact created with generated info, now creating deal");
            const contactIdMatch = contactResult.match(/Contact ID: ([a-f0-9-]+)/i);
            const contactId = contactIdMatch ? contactIdMatch[1] : null;
            
            if (contactId) {
              // We have the contact ID, create the deal
              const dealResult = await create_deal(contactName, dealTitle, dealValue, dealStage);
              setChatLog(prev => prev + "\n\n" + dealResult);
            } else {
              // Fallback to searching for the contact again
              setTimeout(async () => {
                console.log("[CHECK CONTACT] Searching for newly created contact");
                const { data: newContacts } = await supabase
                  .from("contacts")
                  .select("*")
                  .eq("name", contactName)
                  .eq("user_id", userId)
                  .order("created_at", { ascending: false })
                  .limit(1);
                  
                if (newContacts && newContacts.length > 0) {
                  console.log("[CHECK CONTACT] Found newly created contact, creating deal");
                  const dealResult = await create_deal(contactName, dealTitle, dealValue, dealStage);
                  setChatLog(prev => prev + "\n\n" + dealResult);
                } else {
                  setChatLog(prev => prev + "\n\nContact created but could not automatically create deal. Please try creating the deal again.");
                }
              }, 1000); // Wait 1 second for database to update
            }
          } else {
            // Could not generate contact info, show contact form
            console.log("[CHECK CONTACT] Failed to generate contact info, showing contact form");
            setChatLog(`Contact "${contactName}" doesn't exist. Please provide additional contact information.`);
            setContactName(contactName);
            setShowContactForm(true);
            
            // Save deal info for later
            setPendingDealInfo({
              title: dealTitle,
              value: dealValue,
              stage: dealStage
            });
            console.log("[CHECK CONTACT] Saved pending deal info:", { title: dealTitle, value: dealValue, stage: dealStage });
          }
        }
        
        setLoading(false);
        return;
      }
      
      // If multiple contacts found, log a message but proceed with the first one
      if (contacts.length > 1) {
        console.log(`[CHECK CONTACT] Found ${contacts.length} contacts matching "${contactName}". Using the first match:`, contacts[0]);
        setChatLog(prev => prev + `\nFound ${contacts.length} contacts matching "${contactName}". Using ${contacts[0].name} from ${contacts[0].company}.`);
      } else {
        console.log("[CHECK CONTACT] Found exactly one matching contact:", contacts[0]);
      }
      
      // Contact exists, proceed with deal creation
      console.log("[CHECK CONTACT] Proceeding to create deal for contact:", contacts[0].name);
      const dealResult = await create_deal(contactName, dealTitle, dealValue, dealStage);
      setChatLog(dealResult);
      
    } catch (error) {
      console.error("[CHECK CONTACT] Error in checkContactAndCreateDeal:", error);
      setChatLog(`Error checking contact: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <h2 style={{ marginBottom: 16 }}>Email & Deal Assistant</h2>
      
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button 
          onClick={() => {
            setLoading(true);
            setChatLog("Analyzing unread emails and generating replies to critical ones...");
            summarize_unread_message()
              .then(result => setChatLog(result))
              .finally(() => setLoading(false));
          }} 
          style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4 }}
          disabled={loading}
        >
          Analyze & Reply to Emails
        </button>
        
        <button 
          onClick={() => {
            setLoading(true);
            setChatLog("Analyzing stale deals and generating follow-up emails...");
            get_critical_deals()
              .then(result => setChatLog(result))
              .finally(() => setLoading(false));
          }} 
          style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4 }}
          disabled={loading}
        >
          Find & Follow-up Critical Deals
        </button>
        
        <input
          type="text"
          placeholder="Enter LinkedIn search query..."
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flexGrow: 1, marginTop: 8 }}
          disabled={loading}
        />
        <button 
          onClick={() => {
            if (!userPrompt.trim()) {
              setChatLog("Please enter a search query.");
              return;
            }
            setLoading(true);
            setChatLog(`Searching for LinkedIn contacts matching: ${userPrompt}`);
            find_linkedin_contact(userPrompt)
              .then(result => setChatLog(result))
              .finally(() => setLoading(false));
          }} 
          style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4, marginTop: 8 }}
          disabled={loading}
        >
          Find LinkedIn Contact
        </button>
      </div>
      
      {showContactForm ? (
        <div style={{ marginBottom: 16, padding: 16, border: "1px solid #ddd", borderRadius: 4, backgroundColor: "#f9f9f9" }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Create New Contact</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="text"
              placeholder="Contact Name *"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              disabled={loading}
            />
            <input
              type="email"
              placeholder="Email Address *"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Company *"
              value={contactCompany}
              onChange={(e) => setContactCompany(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Job Title"
              value={contactTitle}
              onChange={(e) => setContactTitle(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              disabled={loading}
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              disabled={loading}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button 
                onClick={createContact} 
                style={{ padding: "8px 16px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: 4, flexGrow: 1 }}
                disabled={loading || !contactName.trim() || !contactEmail.trim() || !contactCompany.trim()}
              >
                Create Contact
              </button>
              <button 
                onClick={() => {
                  setShowContactForm(false);
                  setPendingDealInfo(null);
                }} 
                style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4 }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16, padding: 16, border: "1px solid #ddd", borderRadius: 4 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Create New Deal</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="text"
              placeholder="Contact Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Deal Title"
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              disabled={loading}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                placeholder="Deal Value ($)"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flexGrow: 1 }}
                disabled={loading}
              />
              <select
                value={dealStage}
                onChange={(e) => setDealStage(e.target.value)}
                style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flexGrow: 1 }}
                disabled={loading}
              >
                <option value="Prospecting">Prospecting</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Closing">Closing</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button 
                onClick={() => {
                  if (!contactName.trim() || !dealTitle.trim()) {
                    setChatLog("Please enter both Contact Name and Deal Title.");
                    return;
                  }
                  checkContactAndCreateDeal(
                    contactName, 
                    dealTitle, 
                    dealValue ? parseFloat(dealValue) : undefined,
                    dealStage
                  );
                }} 
                style={{ padding: "8px 16px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: 4, flexGrow: 1 }}
                disabled={loading || !contactName.trim() || !dealTitle.trim()}
              >
                Create Deal
              </button>
              <button 
                onClick={() => {
                  setShowContactForm(true);
                }} 
                style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4 }}
                disabled={loading}
              >
                New Contact
              </button>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <input
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="Ask the AI..."
          disabled={loading}
          style={{ width: "100%", padding: 8 }}
        />
        <button type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Processing..." : "Submit"}
        </button>
      </form>

      <pre style={{ whiteSpace: "pre-wrap", marginTop: 20, background: "#eee", padding: 10 }}>
        {chatLog}
      </pre>
    </div>
  );
}