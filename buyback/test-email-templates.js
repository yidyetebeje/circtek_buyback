// Test script for email template functionality
const API_BASE = "http://localhost:5500/api";

async function testEmailTemplateAPI() {
 

  try {
    // Test 1: Create sample templates
   
    const samplesResponse = await fetch(`${API_BASE}/email-templates/samples`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (samplesResponse.ok) {
      const samplesResult = await samplesResponse.json();
     
    } else {
     
    }

    // Test 2: Get all templates
   
    const templatesResponse = await fetch(
      `${API_BASE}/email-templates?limit=10`
    );
    const templatesResult = await templatesResponse.json();

    if (templatesResult.success && templatesResult.data) {
     
      templatesResult.data.forEach((template, index) => {
       
          `   ${index + 1}. ${template.name} (${template.templateType})`
        );
      });
    } else {
     
      return;
    }

    // Test 3: Test preview with existing template
    if (templatesResult.data.length > 0) {
      const firstTemplate = templatesResult.data[0];
     

      const previewResponse = await fetch(
        `${API_BASE}/email-templates/populate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateId: firstTemplate.id,
            orderId: "mock-order-" + Date.now(),
          }),
        }
      );

      if (previewResponse.ok) {
        const previewResult = await previewResponse.json();
       
       
       
          "   Content length:",
          previewResult.data.content.length,
          "characters"
        );
       
          "   Sample fields used:",
          Object.keys(previewResult.data.populatedFields || {}).length
        );
      } else {
       
      }
    }

    // Test 4: Test preview with new template content
   
    const newTemplatePreview = await fetch(
      `${API_BASE}/email-templates/populate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: "preview-template",
          orderId: "mock-order-" + Date.now(),
          subject: "Test Email - {{customer.name}}",
          content:
            "<h2>Hello {{customer.name}}!</h2><p>Your order {{order.orderNumber}} for {{device.brandName}} {{device.modelName}} is being processed.</p><p>Estimated value: {{order.estimatedPrice}}</p>",
        }),
      }
    );

    if (newTemplatePreview.ok) {
      const newPreviewResult = await newTemplatePreview.json();
     
     
     
        "   Content preview:",
        newPreviewResult.data.content.substring(0, 100) + "..."
      );
    } else {
     
    }

    // Test 5: Get dynamic fields
   
    const fieldsResponse = await fetch(
      `${API_BASE}/email-templates/dynamic-fields`
    );

    if (fieldsResponse.ok) {
      const fieldsResult = await fieldsResponse.json();
     
     
        "   Categories:",
        fieldsResult.data.map((group) => group.category).join(", ")
      );
      const totalFields = fieldsResult.data.reduce(
        (sum, group) => sum + group.fields.length,
        0
      );
     
    } else {
     
    }

   
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
   
      "\n💡 Make sure the backend server is running on http://localhost:5500"
    );
  }
}

// Run the test
testEmailTemplateAPI();
