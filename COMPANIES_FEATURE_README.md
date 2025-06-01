# Companies Feature

This document describes the new Companies feature added to the CRM system.

## Overview

The Companies feature allows users to manage their company database and relationships. It provides comprehensive company management capabilities including:

- Company profiles with detailed information
- Industry and size categorization
- Contact information and social media links
- Revenue and employee tracking
- Company scoring and status management
- Advanced search and filtering
- Relationship management with contacts, leads, deals, and activities

## Database Schema

### Companies Table

The `companies` table includes the following fields:

**Basic Information:**
- `id` (UUID, Primary Key)
- `name` (Text, Required) - Company name
- `website` (Text) - Company website URL
- `industry` (Text) - Industry category
- `size` (Text) - Company size (startup, small, medium, large, enterprise)
- `status` (Text) - Company status (prospect, customer, partner, inactive)
- `score` (Integer, 0-100) - Company score/rating

**Contact Information:**
- `phone` (Text) - Phone number
- `email` (Text) - Email address
- `address` (Text) - Street address
- `city` (Text) - City
- `state` (Text) - State/Province
- `country` (Text) - Country
- `postal_code` (Text) - Postal/ZIP code

**Company Details:**
- `revenue` (BigInt) - Annual revenue
- `employees` (Integer) - Number of employees
- `founded_year` (Integer) - Year founded
- `description` (Text) - Company description
- `notes` (Text) - Internal notes

**Social Media:**
- `linkedin_url` (Text) - LinkedIn company page
- `twitter_url` (Text) - Twitter profile
- `facebook_url` (Text) - Facebook page
- `logo_url` (Text) - Company logo URL

**Tracking:**
- `last_contact` (Date) - Last contact date
- `next_follow_up` (Date) - Next follow-up date
- `assigned_to` (UUID) - Assigned team member

**System Fields:**
- `user_id` (UUID, Required) - Owner user ID
- `created_at` (Timestamp) - Creation timestamp
- `updated_at` (Timestamp) - Last update timestamp

### Relationships

The companies table has foreign key relationships with:

- **Contacts** - `contacts.company_id` references `companies.id`
- **Leads** - `leads.company_id` references `companies.id`
- **Deals** - `deals.company_id` references `companies.id`
- **Activities** - `activities.company_id` references `companies.id`

## Features

### 1. Company Management
- Create, read, update, and delete companies
- Comprehensive company profiles
- Form validation and error handling
- Bulk operations support

### 2. Search and Filtering
- Advanced search across multiple fields
- Filter by status, industry, and size
- Relevance-based search results
- Real-time filtering

### 3. Sorting
- Sort by name, industry, size, status, score, revenue, employees, or creation date
- Ascending and descending order
- Visual sort indicators

### 4. Dashboard Integration
- Company statistics on main dashboard
- Total companies count
- Customer/prospect breakdown
- Revenue aggregation

### 5. User Interface
- Modern, responsive design
- Card-based company display
- Status and size badges
- Quick action buttons
- Comprehensive form with sections

### 6. Data Visualization
- Company statistics cards
- Revenue formatting (K, M, B)
- Employee count formatting
- Color-coded status indicators
- Score-based color coding

## Installation

### 1. Database Migration

Run the following SQL script in your Supabase SQL Editor:

```sql
-- Copy the contents of manual-companies-migration.sql
```

### 2. TypeScript Types

The TypeScript types have been updated in `src/integrations/supabase/types.ts` to include:
- Companies table definition
- Foreign key relationships for existing tables
- Updated Row, Insert, and Update types

### 3. Components

The following components have been added:

- `src/components/CompanyForm.tsx` - Company creation/editing form
- `src/components/CompaniesManager.tsx` - Main companies management interface

### 4. Navigation

The companies tab has been added to the main navigation in `src/pages/Index.tsx`.

## Usage

### Adding a Company

1. Navigate to the Companies tab
2. Click "Add Company" button
3. Fill in the company details:
   - **Basic Information**: Name (required), website, industry, size, status, score
   - **Contact Information**: Phone, email
   - **Address**: Street address, city, state, country, postal code
   - **Company Details**: Revenue, employees, founded year
   - **Social Media**: LinkedIn, Twitter, Facebook URLs
   - **Description and Notes**: Company description and internal notes
4. Click "Create Company"

### Managing Companies

- **View**: Browse companies in card format with key information
- **Search**: Use the search bar to find companies by name, industry, location, etc.
- **Filter**: Filter by status, industry, or company size
- **Sort**: Click column headers to sort by different criteria
- **Edit**: Click the edit button on any company card
- **Delete**: Click the delete button and confirm

### Company Relationships

Companies can be linked to:
- **Contacts**: Associate contacts with their companies
- **Leads**: Link leads to target companies
- **Deals**: Connect deals to prospect/customer companies
- **Activities**: Track activities related to specific companies

## Data Validation

### Required Fields
- Company name

### Optional Fields
- All other fields are optional

### Validation Rules
- Score must be between 0-100
- Status must be one of: prospect, customer, partner, inactive
- Size must be one of: startup, small, medium, large, enterprise
- Industry has predefined options
- URLs must be valid format
- Founded year must be reasonable (1800 to current year)

## Security

### Row Level Security (RLS)
- Users can only view, create, update, and delete their own companies
- All operations are scoped to the authenticated user
- Foreign key relationships maintain data integrity

### Policies
- `Users can view their own companies`
- `Users can insert their own companies`
- `Users can update their own companies`
- `Users can delete their own companies`

## Performance

### Indexes
- `idx_companies_user_id` - For user-scoped queries
- `idx_companies_status` - For status filtering
- `idx_companies_name` - For name searching
- `idx_companies_industry` - For industry filtering
- `idx_companies_score` - For score sorting
- `idx_companies_assigned_to` - For assignment queries
- Foreign key indexes on related tables

### Optimizations
- Efficient search algorithms with relevance scoring
- Memoized filtering and sorting
- Lazy loading of company data
- Optimized database queries

## Future Enhancements

Potential future improvements:
1. Company logo upload and management
2. Company hierarchy (parent/subsidiary relationships)
3. Company merge/duplicate detection
4. Advanced analytics and reporting
5. Integration with external company data sources
6. Company timeline and activity history
7. Bulk import/export functionality
8. Company templates and cloning
9. Advanced permission management
10. Company-specific custom fields

## Troubleshooting

### Common Issues

1. **Migration Errors**: Ensure all existing tables exist before running the migration
2. **Permission Errors**: Verify RLS policies are correctly applied
3. **Foreign Key Errors**: Check that referenced tables have proper constraints
4. **Type Errors**: Ensure TypeScript types are properly updated

### Support

For issues or questions about the Companies feature, please refer to:
- Database schema documentation
- Component source code
- Supabase documentation
- React Query documentation 