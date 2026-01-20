/**
 * n8n Webhook Configuration
 * 
 * Configure your n8n webhook URLs here.
 * These webhooks will receive form submissions and save them to Google Sheets.
 */

export const n8nConfig = {
    // Contact form webhook - receives general contact submissions
    contactFormWebhook: process.env.REACT_APP_N8N_CONTACT_WEBHOOK || 'http://localhost:5678/webhook/contact-form',

    // Property contact webhook - receives property-specific inquiries
    propertyContactWebhook: process.env.REACT_APP_N8N_PROPERTY_WEBHOOK || 'http://localhost:5678/webhook/property-contact',

    // Enable/disable n8n integration
    enabled: process.env.REACT_APP_N8N_ENABLED !== 'false',
};
