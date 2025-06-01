# Mock Data for CSV Import Testing

This directory contains sample CSV files that can be used to test the CSV import functionality in the CRM system.

## Available Files

### 1. contacts.csv
Contains sample contact data with the following fields:
- `name` - Full name of the contact
- `email` - Email address
- `company` - Company name
- `phone` - Phone number
- `status` - Contact status (Cold Lead, Hot Lead, Qualified, Customer)
- `persona` - Contact persona/type
- `title` - Job title
- `score` - Lead score (0-100)

**Sample data**: 20 contacts from various companies and industries

### 2. deals.csv
Contains sample deal/pipeline data with the following fields:
- `title` - Deal name/title
- `company` - Company name
- `value` - Deal value in dollars
- `stage` - Pipeline stage (Discovery, Proposal, Negotiation, Closing)
- `probability` - Close probability percentage (0-100)
- `contact_name` - Primary contact name
- `next_step` - Next action required

**Sample data**: 20 deals across different pipeline stages

### 3. leads.csv
Contains sample lead data with the following fields:
- `name` - Lead name
- `email` - Email address
- `company` - Company name
- `phone` - Phone number
- `status` - Lead status (new, contacted, qualified, unqualified)
- `source` - Lead source (manual, form, import, integration)
- `score` - Lead score (0-100)
- `assigned_to` - Assigned sales representative

**Sample data**: 20 leads from various sources

### 4. activities.csv
Contains sample activity data with the following fields:
- `subject` - Activity subject/title
- `type` - Activity type (call, email, meeting, note, task)
- `description` - Detailed description
- `priority` - Priority level (high, medium, low)
- `status` - Activity status (pending, completed, cancelled)
- `due_date` - Due date (YYYY-MM-DD format)

**Sample data**: 25 activities of different types

## How to Use

1. Navigate to the File Management section in the CRM
2. Switch to the "CSV Import" tab
3. Select the data type you want to import (Contacts, Leads, Deals, or Activities)
4. Click "Download Template" to see the expected format
5. Upload one of these sample CSV files to test the import functionality
6. Review the preview and click "Import Data"

## Valid Values

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
- `note` - Notes and observations
- `task` - Tasks and to-dos

### Activity Status Values
- `pending` - Not yet completed
- `completed` - Successfully completed
- `cancelled` - Cancelled or abandoned

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
- Required fields (name for contacts/leads, title for deals, subject+type for activities)
- Data types (numbers for scores, values, probabilities)
- Valid status values (must match database constraints)
- Provides detailed error messages for failed imports

## Tips

- Ensure your CSV files use UTF-8 encoding
- Use quotes around fields that contain commas
- Keep header names simple and descriptive
- Use exact status values as shown above
- Check the preview before importing to ensure data looks correct 