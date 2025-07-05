import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { captureEvent } from '@/lib/posthog-server';

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Field definitions for each data type
const fieldDefinitions = {
  products: [
    { id: 'name', label: 'Product Name', required: true, type: 'string', description: 'Name of the product or service' },
    { id: 'sku', label: 'SKU/Code', required: false, type: 'string', description: 'Stock keeping unit or product code' },
    { id: 'description', label: 'Description', required: false, type: 'text', description: 'Detailed product description' },
    { id: 'unit_price', label: 'Unit Price', required: true, type: 'number', description: 'Selling price per unit' },
    { id: 'cost_price', label: 'Cost Price', required: false, type: 'number', description: 'Cost to acquire/produce' },
    { id: 'category', label: 'Category', required: false, type: 'string', description: 'Product category or type' },
    { id: 'quantity_on_hand', label: 'Current Stock', required: false, type: 'number', description: 'Current inventory quantity' },
    { id: 'reorder_level', label: 'Reorder Level', required: false, type: 'number', description: 'Minimum stock before reorder' },
    { id: 'tax_rate', label: 'Tax Rate', required: false, type: 'number', description: 'Tax percentage' },
    { id: 'barcode', label: 'Barcode', required: false, type: 'string', description: 'Product barcode' },
    { id: 'supplier', label: 'Supplier', required: false, type: 'string', description: 'Vendor or supplier name' },
    { id: 'location', label: 'Location/Warehouse', required: false, type: 'string', description: 'Storage location' },
  ],
  customers: [
    { id: 'name', label: 'Customer Name', required: true, type: 'string', description: 'Full name or company name' },
    { id: 'email', label: 'Email', required: false, type: 'email', description: 'Email address' },
    { id: 'phone', label: 'Phone', required: false, type: 'string', description: 'Phone number' },
    { id: 'company', label: 'Company', required: false, type: 'string', description: 'Company or business name' },
    { id: 'address_line1', label: 'Address Line 1', required: false, type: 'string', description: 'Street address' },
    { id: 'address_line2', label: 'Address Line 2', required: false, type: 'string', description: 'Apartment, suite, etc.' },
    { id: 'city', label: 'City', required: false, type: 'string', description: 'City name' },
    { id: 'state', label: 'State/Province', required: false, type: 'string', description: 'State or province' },
    { id: 'postal_code', label: 'Postal Code', required: false, type: 'string', description: 'ZIP or postal code' },
    { id: 'country', label: 'Country', required: false, type: 'string', description: 'Country name' },
    { id: 'tax_id', label: 'Tax ID', required: false, type: 'string', description: 'Tax identification number' },
    { id: 'credit_limit', label: 'Credit Limit', required: false, type: 'number', description: 'Maximum credit allowed' },
  ],
  invoices: [
    { id: 'invoice_number', label: 'Invoice Number', required: true, type: 'string', description: 'Unique invoice identifier' },
    { id: 'customer_name', label: 'Customer Name', required: true, type: 'string', description: 'Customer or company name' },
    { id: 'invoice_date', label: 'Invoice Date', required: true, type: 'date', description: 'Date invoice was issued' },
    { id: 'due_date', label: 'Due Date', required: false, type: 'date', description: 'Payment due date' },
    { id: 'subtotal', label: 'Subtotal', required: true, type: 'number', description: 'Total before tax' },
    { id: 'tax_amount', label: 'Tax Amount', required: false, type: 'number', description: 'Total tax amount' },
    { id: 'total_amount', label: 'Total Amount', required: true, type: 'number', description: 'Final invoice total' },
    { id: 'payment_status', label: 'Payment Status', required: false, type: 'string', description: 'Paid, unpaid, partial' },
    { id: 'payment_method', label: 'Payment Method', required: false, type: 'string', description: 'How payment was made' },
    { id: 'notes', label: 'Notes', required: false, type: 'text', description: 'Additional notes' },
  ],
};

export async function POST(request) {
  try {
    const { excelHeaders, dataType } = await request.json();

    if (!excelHeaders || !Array.isArray(excelHeaders)) {
      return NextResponse.json(
        { error: 'Excel headers array is required' },
        { status: 400 }
      );
    }

    const dottFields = fieldDefinitions[dataType] || fieldDefinitions.products;

    // Create the prompt for Claude
    const prompt = `You are an expert data mapping assistant. Your task is to analyze Excel column headers and map them to the appropriate database fields.

Excel Headers:
${excelHeaders.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

Target Database Fields:
${dottFields.map(f => `- ${f.id} (${f.label}): ${f.description} [${f.type}]${f.required ? ' *REQUIRED*' : ''}`).join('\n')}

For each Excel header, determine:
1. The best matching database field (if any)
2. Confidence score (0-100)
3. Any data quality suggestions

Consider common variations and abbreviations. For example:
- "Price", "Unit Price", "Selling Price" → unit_price
- "Cost", "Cost Price", "Purchase Price" → cost_price
- "QTY", "Quantity", "Stock", "On Hand" → quantity_on_hand
- "Min Stock", "Reorder Point", "Min Qty" → reorder_level

Return a JSON object with this structure:
{
  "mappings": {
    "Excel Header Name": {
      "field": "database_field_id",
      "confidence": 95,
      "suggestion": "Maps to 'Field Label'",
      "dataQualityNotes": "Optional notes about data formatting"
    }
  },
  "unmappedRequired": ["list", "of", "required", "fields", "not", "mapped"],
  "generalSuggestions": "Overall suggestions for the import"
}`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract JSON from Claude's response
    const responseText = message.content[0].text;
    let analysisResult;
    
    try {
      // Try to parse JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      // Fallback to basic mapping
      analysisResult = {
        mappings: {},
        unmappedRequired: [],
        generalSuggestions: 'Unable to parse AI response, please map manually.'
      };
    }

    // Track the analysis
    await captureEvent('import_field_analysis_completed', {
      dataType,
      headerCount: excelHeaders.length,
      mappedCount: Object.keys(analysisResult.mappings).length,
      model: 'claude-sonnet-4'
    });

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      dataType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Field analysis error:', error);
    
    await captureEvent('import_field_analysis_error', {
      error: error.message,
      dataType: request.body?.dataType
    });

    return NextResponse.json(
      { 
        error: 'Failed to analyze fields', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}