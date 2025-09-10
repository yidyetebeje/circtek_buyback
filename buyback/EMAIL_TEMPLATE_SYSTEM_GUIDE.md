# Email Template System - Complete Guide

## 🚀 Overview

The Email Template System provides a comprehensive solution for creating, managing, and previewing email templates with dynamic content. It includes real-time preview functionality, auto-preview features, and mock data generation for testing without requiring actual orders.

## ✨ Key Features

### 1. **Real-Time Preview System**

- **Auto-Preview**: Automatically generates previews as you type (with 1-second debounce)
- **Manual Preview**: On-demand preview generation with "Update Preview" button
- **Content Change Detection**: Visual indicators when content has changed since last preview
- **Mock Data Integration**: Uses realistic Dutch customer data for previews

### 2. **Rich Text Editor**

- **TipTap Editor**: Full-featured rich text editor with formatting options
- **Dynamic Field Insertion**: Easy insertion of dynamic fields via dropdown
- **Real-time Validation**: Form validation with helpful error messages

### 3. **Dynamic Field System**

- **Categorized Fields**: Organized by customer, device, order, shipping, and shop
- **Easy Insertion**: Click-to-insert dynamic fields in both subject and content
- **Placeholder Format**: Uses `{{field.name}}` format for dynamic content

### 4. **Sample Templates**

- **Pre-built Templates**: 4 professional email templates ready to use
- **Order Lifecycle Coverage**: Templates for confirmation, shipment, inspection, and completion
- **Professional Design**: Modern, responsive email designs

## 🛠 Getting Started

### Prerequisites

- Backend server running on `http://localhost:5500`
- Frontend development server running
- Database properly configured

### Quick Start

1. **Access the Email Templates**

   ```
   Navigate to: /admin/email-templates
   ```

2. **Create Sample Templates** (First Time Setup)

   - Click "Create Sample Templates" if no templates exist
   - This creates 4 professional templates to get you started

3. **Create a New Template**
   - Click "Add Template" button
   - Fill in template details
   - Use the preview feature to test your template

## 📝 Creating Email Templates

### Basic Template Structure

```html
<!-- Subject Line -->
Order Confirmation - {{order.orderNumber}}

<!-- Email Content -->
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Hello {{customer.name}}!</h2>

  <p>Thank you for your order of {{device.brandName}} {{device.modelName}}.</p>

  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
    <h3>Order Details</h3>
    <ul>
      <li><strong>Order Number:</strong> {{order.orderNumber}}</li>
      <li>
        <strong>Device:</strong> {{device.brandName}} {{device.modelName}}
      </li>
      <li><strong>Estimated Value:</strong> {{order.estimatedPrice}}</li>
      <li><strong>Status:</strong> {{order.status}}</li>
    </ul>
  </div>

  <p>Best regards,<br />{{shop.name}}</p>
</div>
```

### Available Dynamic Fields

#### Customer Fields

- `{{customer.name}}` - Customer's full name
- `{{customer.email}}` - Customer's email address

#### Device Fields

- `{{device.modelName}}` - Device model (e.g., "iPhone 14 Pro")
- `{{device.brandName}}` - Device brand (e.g., "Apple")
- `{{device.categoryName}}` - Device category (e.g., "Smartphones")

#### Order Fields

- `{{order.orderNumber}}` - Unique order identifier
- `{{order.status}}` - Current order status
- `{{order.estimatedPrice}}` - Initial price estimate (formatted as EUR)
- `{{order.finalPrice}}` - Final offer price (formatted as EUR)
- `{{order.createdAt}}` - Order creation date (Dutch format)

#### Shipping Fields

- `{{shipping.trackingNumber}}` - Package tracking number
- `{{shipping.provider}}` - Shipping company (e.g., "DHL")

#### Shop Fields

- `{{shop.name}}` - Shop name
- `{{shop.phone}}` - Shop contact phone number

## 🎨 Using the Preview System

### Auto-Preview Feature

1. **Enable Auto-Preview**

   - Toggle the "Auto Preview" switch in the template editor
   - Preview updates automatically after 1 second of inactivity
   - Green indicator shows when auto-preview is active

2. **Content Change Detection**
   - "Outdated" badge appears when content changes
   - Orange warning in preview header
   - Encourages updating the preview

### Manual Preview

1. **Generate Preview**

   - Click "Update Preview" button
   - Switches to preview tab automatically
   - Shows loading spinner during generation

2. **Preview Content**
   - Subject line preview
   - Formatted HTML content
   - Sample data used for population

## 📋 Template Types

### 1. Order Confirmation

- **Purpose**: Welcome email when order is created
- **Trigger**: Order placed by customer
- **Content**: Order details, estimated value, next steps

### 2. Shipment Received

- **Purpose**: Confirmation that device was received
- **Trigger**: Package arrives at facility
- **Content**: Tracking info, inspection timeline

### 3. Inspection Completed

- **Purpose**: Present final offer to customer
- **Trigger**: Device inspection finished
- **Content**: Final price, condition notes, accept/decline options

### 4. Offer Accepted

- **Purpose**: Confirm payment processing
- **Trigger**: Customer accepts the offer
- **Content**: Payment details, processing timeline

## 🔧 Advanced Features

### Mock Data System

The system generates realistic mock data for previews:

```javascript
// Example mock data
{
  customer: {
    name: "John van der Berg",
    email: "john.vandenberg@example.com"
  },
  device: {
    modelName: "iPhone 14 Pro",
    brandName: "Apple",
    categoryName: "Smartphones"
  },
  order: {
    orderNumber: "ORD-1748287679305",
    status: "PENDING_SHIPMENT",
    estimatedPrice: "€299,99",
    finalPrice: "€275,50"
  },
  shipping: {
    trackingNumber: "1Z999AA1234567890",
    provider: "DHL"
  },
  shop: {
    name: "TechBuyback Amsterdam",
    phone: "+31 20 123 4567"
  }
}
```

### Template Validation

- **Required Fields**: Name, subject, content, template type
- **Real-time Validation**: Immediate feedback on form errors
- **Content Requirements**: Minimum content length validation

### Responsive Design

Templates are designed to work across email clients:

- **Mobile-First**: Optimized for mobile devices
- **Email Client Compatibility**: Tested with major email providers
- **Inline CSS**: Better compatibility with email clients

## 🧪 Testing

### API Testing

Use the provided test script:

```bash
node test-email-templates.js
```

This tests:

- Sample template creation
- Template listing
- Preview generation (existing templates)
- Preview generation (new content)
- Dynamic fields loading

### Manual Testing

1. **Create a Template**

   - Fill in all required fields
   - Add dynamic fields to content
   - Test preview functionality

2. **Test Auto-Preview**

   - Enable auto-preview
   - Make changes to content
   - Verify preview updates automatically

3. **Test Dynamic Fields**
   - Insert fields using dropdowns
   - Verify correct placeholder format
   - Check preview shows populated values

## 🚨 Troubleshooting

### Common Issues

#### Preview Not Generating

- **Check**: Backend server is running on port 5500
- **Check**: Template has subject or content
- **Check**: Browser console for errors

#### Dynamic Fields Not Working

- **Check**: Field syntax is `{{field.name}}`
- **Check**: Field exists in dynamic fields list
- **Check**: No typos in field names

#### Auto-Preview Not Working

- **Check**: Auto-preview toggle is enabled
- **Check**: Content has actually changed
- **Check**: Wait for 1-second debounce

### Error Messages

- **"Template or order not found"**: Invalid template ID or preview request
- **"Failed to populate template"**: Server error during preview generation
- **"No dynamic fields available"**: Dynamic fields not loaded from API

## 📚 API Reference

### Endpoints

#### Get Templates

```http
GET /api/email-templates?page=1&limit=20&search=order
```

#### Create Template

```http
POST /api/email-templates
Content-Type: application/json

{
  "name": "Order Confirmation",
  "subject": "Order {{order.orderNumber}} Confirmed",
  "content": "<p>Hello {{customer.name}}...</p>",
  "templateType": "ORDER_CONFIRMATION",
  "isActive": true
}
```

#### Generate Preview

```http
POST /api/email-templates/populate
Content-Type: application/json

{
  "templateId": "preview-template",
  "orderId": "mock-order-123456789",
  "subject": "Test Subject {{customer.name}}",
  "content": "<p>Hello {{customer.name}}!</p>"
}
```

#### Create Sample Templates

```http
POST /api/email-templates/samples
```

#### Get Dynamic Fields

```http
GET /api/email-templates/dynamic-fields
```

## 🎯 Best Practices

### Template Design

1. **Keep It Simple**: Clean, professional design
2. **Mobile-First**: Design for mobile email clients
3. **Brand Consistency**: Use consistent colors and fonts
4. **Clear CTAs**: Make action buttons prominent
5. **Fallback Content**: Provide defaults for missing data

### Content Writing

1. **Clear Subject Lines**: Descriptive and actionable
2. **Personal Touch**: Use customer name and order details
3. **Professional Tone**: Friendly but professional language
4. **Clear Next Steps**: Tell customers what happens next
5. **Contact Information**: Always include support details

### Technical

1. **Test Thoroughly**: Test with different data scenarios
2. **Validate HTML**: Ensure proper HTML structure
3. **Inline CSS**: Use inline styles for email compatibility
4. **Alt Text**: Include alt text for images
5. **Fallback Fonts**: Use web-safe font stacks

## 🔄 Workflow Integration

### Development Workflow

1. **Design Template**: Create template with dynamic fields
2. **Test Preview**: Use auto-preview for rapid iteration
3. **Validate Content**: Check all dynamic fields work
4. **Review Design**: Ensure mobile compatibility
5. **Deploy**: Activate template for production use

### Production Workflow

1. **Order Created**: System selects appropriate template
2. **Data Population**: Dynamic fields filled with order data
3. **Email Generation**: HTML email created from template
4. **Email Sending**: Email sent to customer
5. **Tracking**: Monitor email delivery and engagement

## 📈 Future Enhancements

### Planned Features

- **Email Analytics**: Track open rates and click-through rates
- **A/B Testing**: Test different template versions
- **Conditional Content**: Show/hide content based on conditions
- **Multi-language Support**: Templates in multiple languages
- **Email Scheduling**: Schedule emails for optimal delivery times

### Integration Opportunities

- **CRM Integration**: Sync with customer relationship management
- **Analytics Platform**: Detailed email performance metrics
- **Notification System**: Real-time email status updates
- **Template Marketplace**: Share templates with other shops

---

## 🆘 Support

For technical support or questions about the email template system:

1. **Check Documentation**: Review this guide and API documentation
2. **Test API**: Use the test script to verify functionality
3. **Check Logs**: Review browser console and server logs
4. **Contact Support**: Reach out to the development team

---

_Last updated: January 2025_
