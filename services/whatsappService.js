const axios = require('axios');
const FormData = require('form-data');

/**
 * Send WhatsApp message using 360Messenger API
 * API Documentation: https://api.360messenger.com/v2/sendMessage
 */
async function sendWhatsAppMessage(phoneNumber, text, options = {}) {
  try {
    const apiKey = process.env.WHATSAPP_API_KEY;
    const apiUrl = process.env.WHATSAPP_API_URL || 'https://api.360messenger.com/v2/sendMessage';

    if (!apiKey) {
      console.warn('⚠️ WhatsApp API key not configured');
      return {
        success: false,
        message: 'WhatsApp API key not configured',
        error: 'Missing API key'
      };
    }

    // Format phone number (remove spaces, +, -, ( and ))
    const formattedNumber = phoneNumber.replace(/[\s+\-()]/g, '');

    // Prepare form data
    const formData = new FormData();
    formData.append('phonenumber', formattedNumber);
    formData.append('text', text);

    // Add optional image URL if provided
    if (options.imageUrl) {
      formData.append('url', options.imageUrl);
    }

    // Add optional delay (format: MM-DD-YYYY HH:MM in GMT)
    if (options.delay) {
      formData.append('delay', options.delay);
    }

    // Send request to 360Messenger API
    const response = await axios.post(apiUrl, formData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ WhatsApp message sent via 360Messenger:', {
      to: formattedNumber,
      status: response.status,
      data: response.data
    });

    return {
      success: true,
      message: 'Message sent successfully',
      messageId: response.data?.messageId || response.data?.id || null,
      response: response.data,
      provider: '360messenger',
      phoneNumber: formattedNumber
    };

  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);
    
    return {
      success: false,
      message: 'Failed to send message',
      error: error.response?.data?.message || error.message,
      details: error.response?.data
    };
  }
}

/**
 * Send bulk WhatsApp messages with delay between each
 */
async function sendBulkWhatsAppMessages(recipients, delayMs = 2000) {
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const result = await sendWhatsAppMessage(
        recipient.phoneNumber,
        recipient.message,
        recipient.options || {}
      );
      
      results.push({
        ...result,
        recipient: recipient.name,
        phoneNumber: recipient.phoneNumber
      });
      
      // Add delay between messages to avoid rate limiting
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      results.push({
        success: false,
        recipient: recipient.name,
        phoneNumber: recipient.phoneNumber,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Send WhatsApp message with optional scheduled delay
 * @param {string} phoneNumber - WhatsApp number
 * @param {string} text - Message text
 * @param {Date} scheduledDate - Optional: Schedule for future (GMT)
 * @param {string} imageUrl - Optional: Image URL
 */
async function sendScheduledMessage(phoneNumber, text, scheduledDate = null, imageUrl = null) {
  const options = {};

  if (imageUrl) {
    options.imageUrl = imageUrl;
  }

  if (scheduledDate && scheduledDate instanceof Date) {
    // Format date as MM-DD-YYYY HH:MM (GMT)
    const month = String(scheduledDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(scheduledDate.getUTCDate()).padStart(2, '0');
    const year = scheduledDate.getUTCFullYear();
    const hours = String(scheduledDate.getUTCHours()).padStart(2, '0');
    const minutes = String(scheduledDate.getUTCMinutes()).padStart(2, '0');
    
    options.delay = `${month}-${day}-${year} ${hours}:${minutes}`;
    console.log(`📅 Message scheduled for: ${options.delay} GMT`);
  }

  return await sendWhatsAppMessage(phoneNumber, text, options);
}

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(template, variables) {
  let message = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    message = message.split(placeholder).join(value || '');
  }
  
  return message;
}

/**
 * Test WhatsApp API connection
 */
async function testWhatsAppConnection(testNumber = null) {
  try {
    const apiKey = process.env.WHATSAPP_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        message: 'WhatsApp API key not configured in environment variables'
      };
    }

    // If test number provided, send actual test message
    if (testNumber) {
      const result = await sendWhatsAppMessage(
        testNumber,
        '✅ Test message from IPTV Admin Portal\n\nYour WhatsApp integration is working correctly!'
      );
      return result;
    }

    return {
      success: true,
      message: 'API key is configured. Provide a test number to send actual message.'
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to test connection',
      error: error.message
    };
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendBulkWhatsAppMessages,
  sendScheduledMessage,
  replaceTemplateVariables,
  testWhatsAppConnection
};
