# Deal Whisperer CRM AI

A comprehensive AI-powered CRM system built with React, TypeScript, and Supabase. Features advanced search, sorting, CSV import capabilities, and AI-driven sales coaching.

## Features

### Core CRM Functionality
- **Contact Management**: Store and manage customer contacts with AI-generated personas
- **Lead Management**: Track and convert leads with scoring and source tracking
- **Deal Pipeline**: Manage sales opportunities through customizable pipeline stages
- **Activity Tracking**: Log calls, emails, meetings, notes, and tasks
- **File Management**: Upload and organize documents with CSV import capabilities

### Advanced Search & Filtering
- **Multi-field Search**: Search across names, companies, emails, titles, descriptions
- **Weighted Relevance**: Smart search algorithm with relevance scoring
- **Advanced Filters**: Filter by status, source, score ranges, priority, etc.
- **Flexible Sorting**: Sort by multiple fields with custom ordering
- **Real-time Results**: Instant search and filter updates

### CSV Import System
- **Multi-format Support**: Import contacts, leads, deals, and activities
- **Smart Column Mapping**: Flexible header recognition (e.g., "name", "full_name", "contact_name")
- **Data Validation**: Comprehensive validation with detailed error reporting
- **Template Downloads**: Pre-configured CSV templates for each data type
- **Progress Tracking**: Real-time import progress and results

### AI-Powered Features
- **AI Sales Coach**: Get personalized recommendations for deals
- **Objection Handling**: AI-powered responses to common sales objections
- **Persona Builder**: Automatically generate customer personas
- **Win-Loss Analysis**: AI insights on deal outcomes
- **Email Templates**: AI-generated email templates

## CSV Import Guide

### Supported Data Types

#### 1. Contacts
**Required Fields**: `name`
**Optional Fields**: `email`, `company`, `phone`, `status`, `persona`, `title`, `score`

**Valid Status Values**:
- `Cold Lead`
- `Hot Lead` 
- `Qualified`
- `Customer`

**Example CSV**:
```csv
name,email,company,phone,status,persona,title,score
John Doe,john@example.com,Acme Corp,555-1234,Qualified,decision_maker,CEO,85
```

#### 2. Leads
**Required Fields**: `name`
**Optional Fields**: `email`, `company`, `phone`, `status`, `source`, `score`

**Valid Status Values**:
- `new`
- `contacted`
- `qualified`
- `unqualified`

**Valid Source Values**:
- `manual`
- `form`
- `import`
- `integration`

**Example CSV**:
```csv
name,email,company,phone,status,source,score
Jane Smith,jane@example.com,Tech Inc,555-5678,new,form,75
```

#### 3. Deals
**Required Fields**: `title`
**Optional Fields**: `company`, `value`, `stage`, `probability`, `contact_name`, `next_step`

**Valid Stage Values**:
- `Discovery`
- `Proposal`
- `Negotiation`
- `Closing`

**Example CSV**:
```csv
title,company,value,stage,probability,contact_name,next_step
Big Deal,Acme Corp,50000,Discovery,25,John Doe,Schedule demo
```

#### 4. Activities
**Required Fields**: `subject`, `type`
**Optional Fields**: `description`, `priority`, `status`, `due_date`

**Valid Type Values**:
- `call`
- `email`
- `meeting`
- `note`
- `task`

**Valid Status Values**:
- `pending`
- `completed`
- `cancelled`

**Valid Priority Values**:
- `low`
- `medium`
- `high`

**Example CSV**:
```csv
subject,type,description,priority,status,due_date
Follow up call,call,Call to discuss proposal,high,pending,2024-01-15
```

### Column Header Mapping

The system supports flexible column header naming. These headers will be automatically mapped:

**Name Fields**: `name`, `full_name`, `contact_name`, `lead_name`
**Email Fields**: `email`, `email_address`
**Company Fields**: `company`, `organization`, `company_name`
**Phone Fields**: `phone`, `phone_number`, `mobile`
**Title Fields**: `title`, `job_title`, `position`

### Import Process

1. **Select Data Type**: Choose from Contacts, Leads, Deals, or Activities
2. **Download Template**: Get a sample CSV with correct format and valid values
3. **Upload CSV File**: Select your prepared CSV file
4. **Preview Data**: Review headers, row count, and sample data
5. **Import**: Click "Import Data" to process the file
6. **Review Results**: Check success/error counts and detailed error messages

### Troubleshooting

**Common Import Errors**:

1. **"invalid input syntax for type uuid"**
   - **Cause**: Invalid UUID in assigned_to field
   - **Solution**: Remove assigned_to column or use valid UUIDs

2. **"violates check constraint"**
   - **Cause**: Invalid status/source/stage/type/priority values
   - **Solution**: Use only the valid values listed above

3. **"Name is required"**
   - **Cause**: Missing required name/title/subject field
   - **Solution**: Ensure all rows have required fields filled

4. **"CSV file is empty"**
   - **Cause**: Empty or invalid CSV file
   - **Solution**: Check file format and ensure it contains data

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase project and configure environment variables
4. Run the development server: `npm run dev`

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: React Query (TanStack Query)
- **Charts**: Recharts
- **Icons**: Lucide React

## Database Schema

### Tables
- `contacts`: Customer contact information
- `leads`: Potential customers and prospects
- `deals`: Sales opportunities and pipeline
- `activities`: Sales activities and tasks
- `files`: Document storage metadata

### Key Constraints
- All tables have user-based row-level security
- Status fields use check constraints for data integrity
- Foreign key relationships maintain data consistency
- Automatic timestamps for created_at and updated_at

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
