// Test script for email template functionality
const API_BASE = "http://localhost:5500/api";

async function testEmailTemplateAPI() {
  console.log("🧪 Testing Email Template API...\n");

  try {
    // Test 1: Create sample templates
    console.log("1. Creating sample templates...");
    const samplesResponse = await fetch(`${API_BASE}/email-templates/samples`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (samplesResponse.ok) {
      const samplesResult = await samplesResponse.json();
      console.log("✅ Sample templates created:", samplesResult.message);
    } else {
      console.log("⚠️ Sample templates might already exist or API not running");
    }

    // Test 2: Get all templates
    console.log("\n2. Fetching all templates...");
    const templatesResponse = await fetch(
      `${API_BASE}/email-templates?limit=10`
    );
    const templatesResult = await templatesResponse.json();

    if (templatesResult.success && templatesResult.data) {
      console.log(`✅ Found ${templatesResult.data.length} templates:`);
      templatesResult.data.forEach((template, index) => {
        console.log(
          `   ${index + 1}. ${template.name} (${template.templateType})`
        );
      });
    } else {
      console.log("❌ Failed to fetch templates");
      return;
    }

    // Test 3: Test preview with existing template
    if (templatesResult.data.length > 0) {
      const firstTemplate = templatesResult.data[0];
      console.log(`\n3. Testing preview with template: ${firstTemplate.name}`);

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
        console.log("✅ Preview generated successfully");
        console.log("   Subject:", previewResult.data.subject);
        console.log(
          "   Content length:",
          previewResult.data.content.length,
          "characters"
        );
        console.log(
          "   Sample fields used:",
          Object.keys(previewResult.data.populatedFields || {}).length
        );
      } else {
        console.log("❌ Preview generation failed");
      }
    }

    // Test 4: Test preview with new template content
    console.log("\n4. Testing preview with new template content...");
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
      console.log("✅ New template preview generated successfully");
      console.log("   Subject:", newPreviewResult.data.subject);
      console.log(
        "   Content preview:",
        newPreviewResult.data.content.substring(0, 100) + "..."
      );
    } else {
      console.log("❌ New template preview failed");
    }

    // Test 5: Get dynamic fields
    console.log("\n5. Testing dynamic fields...");
    const fieldsResponse = await fetch(
      `${API_BASE}/email-templates/dynamic-fields`
    );

    if (fieldsResponse.ok) {
      const fieldsResult = await fieldsResponse.json();
      console.log("✅ Dynamic fields loaded successfully");
      console.log(
        "   Categories:",
        fieldsResult.data.map((group) => group.category).join(", ")
      );
      const totalFields = fieldsResult.data.reduce(
        (sum, group) => sum + group.fields.length,
        0
      );
      console.log("   Total fields:", totalFields);
    } else {
      console.log("❌ Failed to load dynamic fields");
    }

    console.log("\n🎉 Email template API testing completed!");
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.log(
      "\n💡 Make sure the backend server is running on http://localhost:5500"
    );
  }
}

// Run the test
testEmailTemplateAPI();
