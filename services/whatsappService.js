const axios = require('axios');

/**
 * Send WhatsApp message using WhatsApp Business API (Meta)
 * You can also switch to Twilio by uncommenting the Twilio section
 */
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    // Format phone number (remove + and spaces)
    const formattedNumber = phoneNumber.replace(/[\s+\-()]/g, '');

    // OPTION 1: Meta WhatsApp Business API
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      const url = `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp message sent via Meta API:', response.data);
      return {
        success: true,
        message: 'Message sent successfully',
        messageId: response.data.messages[0].id,
        provider: 'meta'
      };
    }

    // OPTION 2: Twilio WhatsApp API
    // Uncomment this section if you want to use Twilio
    /*
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          From: twilioNumber,
          To: `whatsapp:+${formattedNumber}`,
          Body: message
        }),
        {
          auth: {
            username: accountSid,
            password: authToken
          }
        }
      );

      console.log('WhatsApp message sent via Twilio:', response.data);
      return {
        success: true,
        message: 'Message sent successfully',
        messageId: response.data.sid,
        provider: 'twilio'
      };
    }
    */

    // If no API is configured, return mock success (for testing)
    console.warn('⚠️ WhatsApp API not configured. Message would be sent to:', formattedNumber);
    console.log('Message content:', message);
    
    return {
      success: true,
      message: 'WhatsApp API not configured. This is a mock response. Please configure your WhatsApp API credentials in .env file.',
      messageId: 'mock_' + Date.now(),
      provider: 'mock',
      phoneNumber: formattedNumber
    };

  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Failed to send message',
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Send bulk WhatsApp messages
 */
async function sendBulkWhatsAppMessages(recipients) {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendWhatsAppMessage(recipient.phoneNumber, recipient.message);
    results.push({
      ...result,
      recipient: recipient.name,
      phoneNumber: recipient.phoneNumber
    });
    
    // Add delay between messages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

module.exports = {
  sendWhatsAppMessage,
  sendBulkWhatsAppMessages
};
