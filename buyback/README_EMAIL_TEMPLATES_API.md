# Email Templates API - Frontend Integration

This document describes how to use the refactored email templates API that follows the same pattern as the model service.

## Overview

The email templates API has been refactored to use:

- **Service Layer**: `emailTemplateService` for API calls
- **React Hooks**: Custom hooks for easy React integration
- **TypeScript Types**: Strongly typed interfaces for data consistency
- **Base API Client**: Unified authentication and error handling

## File Structure

```
buyback/
├── types/emailTemplates.ts           # TypeScript type definitions
├── lib/api/emailTemplateService.ts   # Service layer for API calls
└── hooks/useEmailTemplates.ts        # React hooks for components
```

## Types

All email template related types are defined in `@/types/emailTemplates`:

```typescript
import {
  EmailTemplate,
  EmailTemplateCreateRequest,
  EmailTemplateUpdateRequest,
  EmailTemplateType,
  EMAIL_TEMPLATE_TYPE,
} from "@/types/emailTemplates";
```

## Service Usage

The `emailTemplateService` provides methods for all API operations:

```typescript
import { emailTemplateService } from "@/lib/api/emailTemplateService";

// Get all templates
const templates = await emailTemplateService.getEmailTemplates();

// Get template by ID
const template = await emailTemplateService.getEmailTemplateById("template-id");

// Create new template
const newTemplate = await emailTemplateService.createEmailTemplate({
  name: "Welcome Email",
  subject: "Welcome to {{shop.name}}!",
  content: "<h1>Hello {{customer.name}}</h1>",
  templateType: "ORDER_CONFIRMATION",
});

// Update template
const updatedTemplate = await emailTemplateService.updateEmailTemplate(
  "template-id",
  {
    name: "Updated Welcome Email",
  }
);

// Delete template
await emailTemplateService.deleteEmailTemplate("template-id");
```

## React Hooks

For React components, use the provided hooks that include caching and automatic updates:

### Basic Queries

```typescript
import {
  useEmailTemplates,
  useEmailTemplate,
  useEmailTemplatesByType,
  useActiveEmailTemplates,
} from "@/hooks/useEmailTemplates";

function EmailTemplatesList() {
  // Get paginated list of templates
  const {
    data: templates,
    isLoading,
    error,
  } = useEmailTemplates({
    page: 1,
    limit: 20,
  });

  // Get single template
  const { data: template } = useEmailTemplate("template-id");

  // Get templates by type
  const { data: orderTemplates } =
    useEmailTemplatesByType("ORDER_CONFIRMATION");

  // Get only active templates
  const { data: activeTemplates } = useActiveEmailTemplates();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {templates?.data.map((template) => (
        <div key={template.id}>{template.name}</div>
      ))}
    </div>
  );
}
```

### Mutations

```typescript
import {
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  useToggleEmailTemplateStatus,
  useDuplicateEmailTemplate,
} from "@/hooks/useEmailTemplates";

function EmailTemplateForm() {
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate("template-id");
  const deleteMutation = useDeleteEmailTemplate();
  const toggleMutation = useToggleEmailTemplateStatus();
  const duplicateMutation = useDuplicateEmailTemplate();

  const handleCreate = async (data: EmailTemplateCreateRequest) => {
    try {
      await createMutation.mutateAsync(data);
      // Template created successfully
    } catch (error) {
      // Handle error
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    await toggleMutation.mutateAsync({ id, isActive });
  };

  const handleDuplicate = async (id: string, newName: string) => {
    await duplicateMutation.mutateAsync({ id, newName });
  };

  // Component render...
}
```

### Dynamic Fields and Template Population

```typescript
import {
  useDynamicFields,
  useDynamicFieldsGrouped,
  usePopulateEmailTemplate,
} from "@/hooks/useEmailTemplates";

function TemplateEditor() {
  // Get available dynamic fields
  const { data: dynamicFields } = useDynamicFields();
  const { data: groupedFields } = useDynamicFieldsGrouped();

  // Template preview/population
  const populateMutation = usePopulateEmailTemplate();

  const handlePreview = async (templateId: string, orderId: string) => {
    try {
      const result = await populateMutation.mutateAsync({
        templateId,
        orderId,
      });

      // result.data contains populated subject and content
      console.log("Populated subject:", result.data.subject);
      console.log("Populated content:", result.data.content);
    } catch (error) {
      console.error("Preview failed:", error);
    }
  };

  // Component render...
}
```

## Search and Filtering

```typescript
import { useSearchEmailTemplates } from "@/hooks/useEmailTemplates";

function SearchableTemplateList() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: searchResults } = useSearchEmailTemplates(searchTerm, {
    limit: 10,
  });

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search templates..."
      />

      {searchResults?.data.map((template) => (
        <div key={template.id}>{template.name}</div>
      ))}
    </div>
  );
}
```

## Template Types

Use the predefined template types:

```typescript
import { EMAIL_TEMPLATE_TYPE } from "@/types/emailTemplates";

const templateTypes = Object.values(EMAIL_TEMPLATE_TYPE);
// ['ORDER_CONFIRMATION', 'SHIPMENT_RECEIVED', 'INSPECTION_COMPLETED', ...]
```

## Error Handling

All hooks and services use the same error handling pattern:

```typescript
const { data, error, isLoading } = useEmailTemplates();

if (error) {
  // Error contains status and message
  console.error(`API Error ${error.status}: ${error.message}`);
}
```

## Authentication

All API calls are automatically authenticated using the base API client. Protected routes will include the Bearer token from the user's session.

## Cache Management

React Query automatically manages caching and invalidation:

- Creating/updating/deleting templates automatically refreshes related queries
- Use `queryClient.invalidateQueries()` for manual cache invalidation
- Pagination and search results use `keepPreviousData` for smooth UX

## Migration from Direct API Calls

If you have existing code making direct API calls, replace them with the service methods:

```typescript
// Before (direct fetch)
const response = await fetch("/api/email-templates", {
  headers: { Authorization: `Bearer ${token}` },
});
const templates = await response.json();

// After (using service)
const templates = await emailTemplateService.getEmailTemplates();

// Or in React components (using hooks)
const { data: templates } = useEmailTemplates();
```

This provides better type safety, error handling, caching, and automatic authentication.
