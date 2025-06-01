# Mock Data for CRM System Testing

This directory contains comprehensive sample CSV files that can be used to test various functionalities in the CRM system, including CSV import, data relationships, and feature demonstrations.

## Available Files

### 1. companies.csv
Contains sample company data with comprehensive business information:
- `name` - Company name (required)
- `website` - Company website URL
- `industry` - Industry category (technology, healthcare, finance, manufacturing, retail, education, consulting, real-estate, media, other)
- `size` - Company size (startup, small, medium, large, enterprise)
- `phone` - Company phone number
- `email` - Company email address
- `address` - Street address
- `city` - City
- `state` - State/Province
- `country` - Country
- `postal_code` - Postal/ZIP code
- `description` - Company description
- `status` - Company status (prospect, customer, partner, inactive)
- `revenue` - Annual revenue in dollars
- `employees` - Number of employees
- `founded_year` - Year company was founded
- `linkedin_url` - LinkedIn company page URL
- `twitter_url` - Twitter profile URL
- `facebook_url` - Facebook page URL
- `notes` - Internal notes
- `score` - Company score (0-100)

**Sample data**: 20 companies across various industries and sizes with realistic business data

### 2. contacts.csv
Contains sample contact data linked to companies:
- `name` - Full name of the contact
- `email` - Email address
- `company_name` - Company name (links to companies.csv)
- `phone` - Phone number
- `status` - Contact status (Cold Lead, Hot Lead, Qualified, Customer)
- `persona` - Contact persona/type
- `title` - Job title
- `score` - Lead score (0-100)

**Sample data**: 25 contacts from various companies with realistic job titles and personas

### 3. leads.csv
Contains sample lead data linked to companies:
- `name` - Lead name
- `email` - Email address
- `company_name` - Company name (links to companies.csv)
- `phone` - Phone number
- `status` - Lead status (new, contacted, qualified, unqualified)
- `source` - Lead source (manual, form, import, integration)
- `score` - Lead score (0-100)

**Sample data**: 25 leads from various sources with company relationships

### 4. deals.csv
Contains sample deal/pipeline data linked to companies and contacts:
- `title` - Deal name/title
- `company_name` - Company name (links to companies.csv)
- `value` - Deal value in dollars
- `stage` - Pipeline stage (Discovery, Proposal, Negotiation, Closing)
- `probability` - Close probability percentage (0-100)
- `contact_name` - Primary contact name (links to contacts.csv)
- `next_step` - Next action required

**Sample data**: 25 deals across different pipeline stages with realistic values

### 5. activities.csv
Contains sample activity data linked to companies and contacts:
- `subject` - Activity subject/title
- `type` - Activity type (call, email, meeting, task)
- `description` - Detailed description
- `priority` - Priority level (high, medium, low)
- `status` - Activity status (pending, completed)
- `due_date` - Due date (YYYY-MM-DD format)
- `company_name` - Related company (links to companies.csv)
- `contact_name` - Related contact (links to contacts.csv)

**Sample data**: 25 activities with company and contact relationships

### 6. email_templates.csv
Contains sample email templates for various sales scenarios:
- `name` - Template name
- `subject` - Email subject line
- `body` - Email body content with merge fields
- `is_active` - Whether template is active (true/false)

**Sample data**: 8 email templates including welcome emails, follow-ups, proposals, and cold outreach

### 7. segments.csv
Contains sample customer segments for targeting and campaigns:
- `name` - Segment name
- `description` - Segment description
- `criteria` - JSON criteria for segment rules
- `is_dynamic` - Whether segment updates automatically (true/false)

**Sample data**: 15 segments including industry-based, size-based, and behavior-based segments

### 8. email_tracking.csv
Contains sample email tracking data for campaign analysis:
- `email_id` - Unique email identifier
- `subject` - Email subject line
- `contact_name` - Recipient contact name
- `company_name` - Recipient company name
- `sent_at` - When email was sent
- `opened_at` - When email was opened (if opened)
- `clicked_at` - When links were clicked (if clicked)
- `replied_at` - When recipient replied (if replied)

**Sample data**: 20 email tracking records with realistic engagement patterns

## Data Relationships

The mock data is designed with realistic relationships between entities:

- **Companies** serve as the central hub for all relationships
- **Contacts** are linked to specific companies
- **Leads** are associated with target companies
- **Deals** connect companies and contacts in sales opportunities
- **Activities** track interactions with specific companies and contacts
- **Email Tracking** shows communication history with contacts and companies

## How to Use

### For CSV Import Testing
1. Navigate to the File Management section in the CRM
2. Switch to the "CSV Import" tab
3. Select the data type you want to import
4. Upload the corresponding CSV file
5. Review the preview and import

### For Feature Demonstration
1. Import companies.csv first to establish the company database
2. Import contacts.csv to add people associated with companies
3. Import leads.csv to add potential prospects
4. Import deals.csv to populate the sales pipeline
5. Import activities.csv to show interaction history
6. Use email_templates.csv for email campaign setup
7. Use segments.csv for customer segmentation
8. Use email_tracking.csv for campaign analysis

## Valid Values

### Company Industry Values
- `technology` - Technology companies
- `healthcare` - Healthcare organizations
- `finance` - Financial services
- `manufacturing` - Manufacturing companies
- `retail` - Retail businesses
- `education` - Educational institutions
- `consulting` - Consulting firms
- `real-estate` - Real estate companies
- `media` - Media and entertainment
- `other` - Other industries

### Company Size Values
- `startup` - Startup (1-10 employees)
- `small` - Small (11-50 employees)
- `medium` - Medium (51-200 employees)
- `large` - Large (201-1000 employees)
- `enterprise` - Enterprise (1000+ employees)

### Company Status Values
- `prospect` - Potential customer
- `customer` - Current customer
- `partner` - Business partner
- `inactive` - Inactive relationship

### Contact Status Values
- `Cold Lead` - New or unengaged contacts
- `Hot Lead` - Engaged and interested contacts
- `Qualified` - Contacts that meet qualification criteria
- `Customer` - Existing customers

### Lead Status Values
- `new` - Newly acquired leads
- `contacted` - Leads that have been contacted
- `qualified` - Leads that meet qualification criteria
- `unqualified` - Leads that don't meet criteria

### Lead Source Values
- `manual` - Manually entered leads
- `form` - Web form submissions
- `import` - Imported from external sources
- `integration` - From integrated systems

### Deal Stage Values
- `Discovery` - Initial discovery phase
- `Proposal` - Proposal submitted
- `Negotiation` - Contract negotiation
- `Closing` - Final closing phase

### Activity Type Values
- `call` - Phone calls
- `email` - Email communications
- `meeting` - Meetings and appointments
- `task` - Tasks and to-dos

### Activity Status Values
- `pending` - Not yet completed
- `completed` - Successfully completed

### Activity Priority Values
- `low` - Low priority
- `medium` - Medium priority
- `high` - High priority

## Column Mapping

The import system supports flexible column header mapping. For example:
- `name`, `full_name`, or `contact_name` will all map to the name field
- `email` or `email_address` will map to the email field
- `company`, `organization`, or `company_name` will map to the company field

## Data Validation

The import system validates:
- Required fields (name for contacts/leads/companies, title for deals, subject+type for activities)
- Data types (numbers for scores, values, probabilities)
- Valid status values (must match database constraints)
- Relationship integrity (company names must exist when referenced)
- Provides detailed error messages for failed imports

## Tips

- **Import Order**: Import companies first, then contacts, leads, deals, and activities to maintain relationships
- **Encoding**: Ensure your CSV files use UTF-8 encoding
- **Formatting**: Use quotes around fields that contain commas
- **Headers**: Keep header names simple and descriptive
- **Values**: Use exact status values as shown above
- **Preview**: Always check the preview before importing to ensure data looks correct
- **Relationships**: When importing related data, ensure parent records (companies) exist first

## Sample Scenarios

The mock data supports various testing scenarios:

1. **Complete CRM Setup**: Import all files to create a fully populated CRM system
2. **Company Management**: Use companies.csv to test company features and relationships
3. **Sales Pipeline**: Use deals.csv with contacts.csv to test pipeline management
4. **Lead Management**: Use leads.csv to test lead qualification and conversion
5. **Activity Tracking**: Use activities.csv to test task and interaction management
6. **Email Campaigns**: Use email_templates.csv and email_tracking.csv for email features
7. **Customer Segmentation**: Use segments.csv to test targeting and filtering capabilities 