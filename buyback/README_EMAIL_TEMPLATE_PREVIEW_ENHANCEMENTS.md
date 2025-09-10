# Email Template Preview Enhancements

This document outlines the enhanced email template preview functionality that provides real-time preview capabilities, auto-preview features, and improved user experience for creating and editing email templates.

## 🚀 New Features

### 1. Auto-Preview Functionality

- **Real-time Updates**: Templates are automatically previewed as you type
- **Debounced Updates**: Prevents excessive API calls with 1-second debounce
- **Toggle Control**: Users can enable/disable auto-preview with a simple switch
- **Visual Indicators**: Clear feedback when auto-preview is active

### 2. Enhanced Preview Interface

- **Content Change Detection**: Visual indicators when content has changed since last preview
- **Outdated Preview Badges**: Clear warnings when preview is outdated
- **Sample Data Display**: Shows the mock data used for preview generation
- **Improved Loading States**: Better visual feedback during preview generation

### 3. Mock Data System

- **Realistic Dutch Data**: Uses authentic Dutch names, addresses, and phone numbers
- **Device-Specific Data**: Generates appropriate device information (iPhone 14 Pro, etc.)
- **Order Status Mapping**: Different mock statuses based on template type
- **Currency Formatting**: Proper EUR formatting with Dutch locale
- **Date Formatting**: Dutch date formatting for better localization

### 4. User Experience Improvements

- **Tabbed Interface**: Clean separation between editing and preview
- **Dynamic Field Insertion**: Easy insertion of dynamic fields into subject and content
- **Field Categories**: Organized dynamic fields by category (order, device, customer, etc.)
- **Validation Feedback**: Real-time form validation with helpful error messages

## 🛠 Technical Implementation

### Frontend Components

#### EmailTemplateFormWithPreview

```typescript
// Key features:
- Auto-preview with debounced updates
- Real-time content change detection
- Enhanced UI with badges and indicators
- Custom debounce implementation (no external dependencies)
```

#### Enhanced Hooks

```typescript
// usePopulateEmailTemplate
- Handles preview generation
- Error handling and loading states
- React Query integration for caching

// useDynamicFieldsGrouped
- Fetches and organizes dynamic fields
- Grouped by category for better UX
```

### Backend Services

#### EmailTemplateService Enhancements

```typescript
// Mock data generation
generateMockOrderData(shopId: number, templateType?: string)

// Template type-specific mock statuses
getMockStatusForTemplateType(templateType?: string)

// Enhanced preview support
populateTemplate(request: EmailTemplatePopulateRequest, shopId: number)
```

#### Sample Templates

- 4 pre-built professional email templates
- Order Confirmation, Shipment Received, Inspection Completed, Offer Accepted
- Rich HTML content with proper styling
- Dynamic field integration

## 📋 Usage Guide

### Creating a New Template

1. **Navigate to Email Templates**

   ```
   Admin Dashboard → Email Templates → Add Template
   ```

2. **Fill Basic Information**

   - Template Name
   - Template Type (affects mock data generation)
   - Subject Line (supports dynamic fields)

3. **Design Content**

   - Use the rich text editor for HTML content
   - Insert dynamic fields using the dropdown
   - Fields are automatically formatted as `{{field.name}}`

4. **Enable Auto-Preview**

   - Toggle the "Auto Preview" switch
   - Content will update automatically as you type
   - 1-second debounce prevents excessive API calls

5. **Manual Preview**
   - Click "Update Preview" for immediate preview
   - Switch to Preview tab to see results
   - View sample data used for generation

### Dynamic Fields

Available field categories:

- **Order**: `order.orderNumber`, `order.status`, `order.estimatedPrice`, etc.
- **Device**: `device.modelName`, `device.brandName`, `device.categoryName`
- **Customer**: `customer.name`, `customer.email`
- **Shop**: `shop.name`, `shop.phone`
- **Shipping**: `shipping.trackingNumber`, `shipping.provider`

### Preview Features

#### Auto-Preview

- Enable with the toggle switch
- Updates preview automatically after 1 second of inactivity
- Visual indicator shows when auto-preview is active
- Automatically switches to preview tab when generated

#### Manual Preview

- Click "Update Preview" button
- Immediate preview generation
- Shows loading spinner during generation
- Error handling for failed requests

#### Content Change Detection

- "Outdated" badge appears when content changes
- Orange warning badge in preview header
- Encourages users to update preview

## 🎨 Sample Templates

### 1. Order Confirmation

- Professional welcome email
- Order details with device information
- Estimated value and order status
- Shop contact information

### 2. Shipment Received

- Confirmation of device receipt
- Tracking information display
- Timeline expectations
- Branded styling with green theme

### 3. Inspection Completed

- Final offer presentation
- Price comparison (estimated vs final)
- Accept/Decline action buttons
- Condition notes section

### 4. Offer Accepted

- Payment processing confirmation
- Amount and timeline details
- Professional thank you message
- Contact information for support

## 🔧 Configuration

### Mock Data Customization

The mock data can be customized in `EmailTemplateService`:

```typescript
// Customize mock customer data
const mockData = {
  sellerName: "John van der Berg",
  sellerEmail: "john.vandenberg@example.com",
  sellerPhoneNumber: "+31 6 12345678",
  // ... other fields
};
```

### Template Types

Add new template types in the enum:

```typescript
export const EMAIL_TEMPLATE_TYPE = {
  ORDER_CONFIRMATION: "ORDER_CONFIRMATION",
  SHIPMENT_RECEIVED: "SHIPMENT_RECEIVED",
  // Add new types here
} as const;
```

### Dynamic Fields

Add new dynamic fields in the default fields array:

```typescript
export const DEFAULT_DYNAMIC_FIELDS = [
  {
    fieldKey: "new.field",
    displayName: "New Field",
    description: "Description of the new field",
    category: "category",
    dataType: "string",
    defaultValue: "",
    isActive: 1,
  },
  // ... other fields
];
```

## 🚦 API Endpoints

### Preview Template

```http
POST /api/email-templates/populate
Content-Type: application/json

{
  "templateId": "preview-template",
  "orderId": "mock-order-123456789",
  "subject": "Order Confirmation - {{order.orderNumber}}",
  "content": "<p>Dear {{customer.name}}, ...</p>"
}
```

### Create Sample Templates

```http
POST /api/email-templates/samples
```

### Get Dynamic Fields

```http
GET /api/email-templates/dynamic-fields
```

## 🎯 Best Practices

### Template Design

1. **Use Semantic HTML**: Proper heading structure and semantic elements
2. **Mobile-First**: Design for mobile email clients
3. **Inline CSS**: Use inline styles for better email client compatibility
4. **Alt Text**: Include alt text for images
5. **Fallback Fonts**: Use web-safe font stacks

### Dynamic Fields

1. **Descriptive Names**: Use clear, descriptive field names
2. **Default Values**: Always provide sensible default values
3. **Data Validation**: Validate field data before template population
4. **Error Handling**: Handle missing or invalid field data gracefully

### Performance

1. **Debounced Updates**: Auto-preview uses 1-second debounce
2. **Efficient Queries**: React Query caching reduces API calls
3. **Lazy Loading**: Components load only when needed
4. **Optimized Rendering**: Minimal re-renders with proper dependencies

## 🐛 Troubleshooting

### Common Issues

#### Preview Not Updating

- Check if auto-preview is enabled
- Verify content has actually changed
- Check browser console for errors
- Ensure backend API is running

#### Dynamic Fields Not Working

- Verify field syntax: `{{field.name}}`
- Check if field exists in dynamic fields list
- Ensure field has proper data type
- Verify mock data includes the field

#### Styling Issues

- Use inline CSS for email compatibility
- Test with different email clients
- Avoid complex CSS features
- Use table-based layouts for better support

### Debug Mode

Enable debug logging:

```typescript
// In EmailTemplateService
console.log("Mock data generated:", mockData);
console.log("Populated fields:", populatedFields);
```

## 🔮 Future Enhancements

### Planned Features

1. **Template Versioning**: Track template changes over time
2. **A/B Testing**: Compare different template versions
3. **Analytics Integration**: Track email performance metrics
4. **Advanced Styling**: Visual CSS editor
5. **Template Library**: Shared template marketplace
6. **Multi-language Support**: Localized template content
7. **Conditional Content**: Show/hide content based on data
8. **Email Client Testing**: Preview in different email clients

### Technical Improvements

1. **WebSocket Updates**: Real-time collaborative editing
2. **Offline Support**: Work without internet connection
3. **Template Validation**: Advanced content validation
4. **Performance Monitoring**: Track preview generation times
5. **Caching Strategy**: Improved caching for better performance

## 📚 Related Documentation

- [Email Template API Documentation](./README_EMAIL_TEMPLATES_API.md)
- [Dynamic Fields Guide](./README_DYNAMIC_FIELDS.md)
- [Template Migration Guide](./EMAIL_TEMPLATE_MIGRATION_SUMMARY.md)
- [Customization Architecture](./CUSTOMIZATION_ARCHITECTURE.md)

---

**Last Updated**: December 2024  
**Version**: 2.0.0  
**Maintainer**: Development Team
