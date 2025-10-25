const express = require('express');
const { execute, getOne, getAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Get all WhatsApp templates
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let sql = 'SELECT * FROM whatsapp_templates';
    const params = [];
    
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY template_type ASC';
    
    const templates = await getAll(sql, params);
    
    // Parse JSON variables for each template
    const parsedTemplates = templates.map(template => ({
      ...template,
      variables: template.variables ? JSON.parse(template.variables) : []
    }));
    
    res.json({ success: true, templates: parsedTemplates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get single template
 */
router.get('/:id', async (req, res) => {
  try {
    const template = await getOne('SELECT * FROM whatsapp_templates WHERE id = ?', [req.params.id]);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    template.variables = template.variables ? JSON.parse(template.variables) : [];
    res.json({ success: true, template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * Get template by type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const template = await getOne(
      'SELECT * FROM whatsapp_templates WHERE template_type = ?',
      [req.params.type]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    template.variables = template.variables ? JSON.parse(template.variables) : [];
    res.json({ success: true, template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * Update template
 */
router.put('/:id', async (req, res) => {
  try {
    const { template_name, message_content, description, variables, status } = req.body;
    
    // Validate variables is an array
    let variablesJson = '[]';
    if (variables) {
      variablesJson = Array.isArray(variables) ? JSON.stringify(variables) : variables;
    }
    
    await execute(
      `UPDATE whatsapp_templates 
       SET template_name = ?, message_content = ?, description = ?, variables = ?, status = ?
       WHERE id = ?`,
      [template_name, message_content, description, variablesJson, status, req.params.id]
    );

    const updatedTemplate = await getOne('SELECT * FROM whatsapp_templates WHERE id = ?', [req.params.id]);
    updatedTemplate.variables = updatedTemplate.variables ? JSON.parse(updatedTemplate.variables) : [];
    
    res.json({
      success: true,
      message: 'Template updated successfully',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * Preview template with sample data
 */
router.post('/:id/preview', async (req, res) => {
  try {
    const template = await getOne('SELECT * FROM whatsapp_templates WHERE id = ?', [req.params.id]);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { sampleData } = req.body;
    let preview = template.message_content;
    
    // Replace variables with sample data
    if (sampleData) {
      for (const [key, value] of Object.entries(sampleData)) {
        const placeholder = `{${key}}`;
        preview = preview.split(placeholder).join(value || '[Missing]');
      }
    }
    
    res.json({
      success: true,
      preview,
      originalTemplate: template.message_content
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

/**
 * Test send template
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { phoneNumber, testData } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const template = await getOne('SELECT * FROM whatsapp_templates WHERE id = ?', [req.params.id]);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { sendWhatsAppMessage, replaceTemplateVariables } = require('../services/whatsappService');
    
    const message = replaceTemplateVariables(template.message_content, testData || {});
    const result = await sendWhatsAppMessage(phoneNumber, message);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test message sent successfully' : 'Failed to send test message',
      details: result
    });
  } catch (error) {
    console.error('Error sending test template:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

module.exports = router;
