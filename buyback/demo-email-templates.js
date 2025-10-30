// Demo script for email template system
const API_BASE = "http://localhost:5500/api";

async function demoEmailTemplateSystem() {
 

  try {
    // Demo 1: Create a custom template
   
    const customTemplate = {
      name: "Welcome Email",
      subject: "Welcome to {{shop.name}}, {{customer.name}}!",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Welcome to {{shop.name}}!</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0;">Hello {{customer.name}}! 👋</h2>
            <p style="margin: 0; font-size: 18px;">Thank you for choosing our service</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 30px;">
            <h3 style="color: #1e40af; margin-top: 0;">What happens next?</h3>
            <ol style="color: #475569; line-height: 1.6;">
              <li>📦 Send us your {{device.brandName}} {{device.modelName}}</li>
              <li>🔍 We'll inspect it carefully</li>
              <li>💰 You'll receive our best offer</li>
              <li>✅ Accept and get paid quickly!</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Track Your Order
            </a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b;">
            <p>Need help? Contact us at {{shop.phone}}</p>
            <p style="font-size: 14px;">{{shop.name}} - Your trusted device buyback partner</p>
          </div>
        </div>
      `,
      templateType: "CUSTOM",
      isActive: true,
    };

    const createResponse = await fetch(`${API_BASE}/email-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customTemplate),
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
     

      // Demo 2: Generate preview for the new template
     
      const previewResponse = await fetch(
        `${API_BASE}/email-templates/populate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: result.data.id,
            orderId: "demo-order-" + Date.now(),
          }),
        }
      );

      if (previewResponse.ok) {
        const previewResult = await previewResponse.json();
       
       
       
          "   Content length:",
          previewResult.data.content.length,
          "characters"
        );

        // Save preview to file for viewing
        const fs = await import("fs");
        const previewHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${previewResult.data.subject}</title>
    <style>
        body { margin: 0; padding: 20px; background-color: #f5f5f5; font-family: Arial, sans-serif; }
        .email-container { background: white; max-width: 800px; margin: 0 auto; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .subject { background: #2563eb; color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .content { line-height: 1.6; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="subject">
            <h2 style="margin: 0;">📧 ${previewResult.data.subject}</h2>
        </div>
        <div class="content">
            ${previewResult.data.content}
        </div>
    </div>
</body>
</html>`;

        fs.default.writeFileSync("email-preview-demo.html", previewHtml);
       
      }
    }

    // Demo 3: Test different template types
   

    const scenarios = [
      {
        name: "Order Confirmation",
        subject: "Your Order {{order.orderNumber}} is Confirmed! 🎉",
        content:
          "<h2>Thank you {{customer.name}}!</h2><p>Your {{device.brandName}} {{device.modelName}} order is confirmed. Estimated value: {{order.estimatedPrice}}</p>",
      },
      {
        name: "Urgent Inspection",
        subject: "URGENT: {{device.modelName}} Inspection Results",
        content:
          '<div style="border: 2px solid #dc2626; padding: 20px; border-radius: 8px;"><h2 style="color: #dc2626;">Inspection Complete</h2><p>{{customer.name}}, we found some issues with your {{device.modelName}}. Final offer: {{order.finalPrice}}</p></div>',
      },
      {
        name: "Celebration Email",
        subject: "🎊 Congratulations {{customer.name}}! Payment Sent!",
        content:
          '<div style="background: linear-gradient(45deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px;"><h1>🎉 Payment Sent!</h1><p>{{customer.name}}, your {{order.finalPrice}} payment for the {{device.modelName}} has been processed!</p></div>',
      },
    ];

    for (const scenario of scenarios) {
      const previewResponse = await fetch(
        `${API_BASE}/email-templates/populate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: "preview-template",
            orderId: "demo-" + Date.now(),
            subject: scenario.subject,
            content: scenario.content,
          }),
        }
      );

      if (previewResponse.ok) {
        const result = await previewResponse.json();
       
      }
    }

    // Demo 4: Show dynamic fields usage
   
    const fieldsResponse = await fetch(
      `${API_BASE}/email-templates/dynamic-fields`
    );

    if (fieldsResponse.ok) {
      const fieldsResult = await fieldsResponse.json();
      fieldsResult.data.forEach((group) => {
       
        group.fields.forEach((field) => {
         
        });
      });
    }

    // Demo 5: Performance test
   
    const startTime = Date.now();

    const promises = Array.from({ length: 5 }, (_, i) =>
      fetch(`${API_BASE}/email-templates/populate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "preview-template",
          orderId: `perf-test-${i}`,
          subject: `Performance Test ${i + 1} - {{customer.name}}`,
          content: `<p>This is performance test ${
            i + 1
          } for {{customer.name}} with order {{order.orderNumber}}</p>`,
        }),
      })
    );

    await Promise.all(promises);
    const endTime = Date.now();
   
      `   ⚡ Generated 5 previews in ${endTime - startTime}ms (avg: ${
        (endTime - startTime) / 5
      }ms per preview)`
    );

   
   
   
   
   
   
   
   
   
   
   
   
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
   
      "\n💡 Make sure the backend server is running on http://localhost:5500"
    );
  }
}

// Run the demo
demoEmailTemplateSystem();
