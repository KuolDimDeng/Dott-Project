import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { extractTenantId } from '@/utils/request-utils';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

// Mock database for development
const mockDb = {
  customers: []
};

/**
 * DELETE handler for removing a customer with RLS
 */
export async function DELETE(request, { params }) {
  const requestId = uuidv4();

  try {
    const { id } = params;
    logger.info(`[${requestId}] Deleting customer with ID: ${id}`);
    
    // Extract tenant ID using the secure utility function
    const tenantInfo = await extractTenantId(request);
    
    // Use the same tenant ID extraction logic as the product API
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request for customer deletion`);
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    // In production, use a database
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      try {
        // Import the RLS database utility
        const db = await import('@/utils/db/rls-database');
        
        // Delete using tenant context for RLS
        const result = await db.transaction(async (client) => {
          // Delete the customer with tenant ID context for RLS
          const deleteQuery = `
            DELETE FROM public.crm_customer
            WHERE id = $1
            RETURNING id
          `;
          
          const result = await client.query(deleteQuery, [id]);
          return result;
        }, {
          debug: true,
          requestId,
          tenantId: finalTenantId // Set the tenant context for RLS
        });
        
        if (result.rowCount === 0) {
          logger.warn(`[${requestId}] Customer ${id} not found or not owned by tenant ${finalTenantId}`);
          return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
        }
        
        logger.info(`[${requestId}] Customer ${id} deleted successfully for tenant ${finalTenantId}`);
        
        // Invalidate cache for this tenant's customers
        const cacheKey = `customers_${finalTenantId}`;
        setCacheValue(cacheKey, null);
        
        return NextResponse.json({
          success: true,
          message: 'Customer deleted successfully'
        });
      } catch (error) {
        logger.error(`[${requestId}] Error deleting customer:`, error);
        
        // Fall back to mock database
        const index = mockDb.customers.findIndex(c => c.id === id);
        if (index !== -1) {
          mockDb.customers.splice(index, 1);
          return NextResponse.json({ success: true });
        }
        
        return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
      }
    } else {
      // Development mode - use mock database
      const index = mockDb.customers.findIndex(c => c.id === id);
      if (index !== -1) {
        mockDb.customers.splice(index, 1);
        logger.info(`[${requestId}] Deleted customer ${id} from mock database`);
        
        // Invalidate cache for any tenant's customers in dev mode
        setCacheValue(`customers_${finalTenantId}`, null);
        
        return NextResponse.json({ success: true });
      }
      
      logger.warn(`[${requestId}] Customer ${id} not found in mock database`);
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }
  } catch (error) {
    logger.error(`[${requestId}] Error processing customer delete request:`, error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET handler for retrieving a customer by ID with RLS
 */
export async function GET(request, { params }) {
  const requestId = uuidv4();
  
  try {
    const { id } = params;
    logger.info(`[${requestId}] Getting customer with ID: ${id}`);
    
    // Extract tenant ID using the secure utility function
    const tenantInfo = await extractTenantId(request);
    
    // Use the same tenant ID extraction logic as the product API
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request for getting customer`);
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    // Check cache first for this specific customer
    const cacheKey = `customer_${finalTenantId}_${id}`;
    const cachedCustomer = getCacheValue(cacheKey);
    
    if (cachedCustomer) {
      logger.info(`[${requestId}] Retrieved customer ${id} from AppCache`);
      return NextResponse.json(cachedCustomer);
    }
    
    // In production, use a database
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      try {
        // Import the RLS database utility
        const db = await import('@/utils/db/rls-database');
        
        // Query with RLS
        const result = await db.query(
          `SELECT * FROM public.crm_customer WHERE id = $1`,
          [id],
          {
            requestId,
            tenantId: finalTenantId,
            debug: true
          }
        );
        
        if (result.rows.length === 0) {
          logger.warn(`[${requestId}] No customer found with ID ${id} for tenant ${finalTenantId}`);
          return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
        }
        
        const customer = result.rows[0];
        logger.info(`[${requestId}] Successfully retrieved customer ${id}`);
        
        // Cache the result
        setCacheValue(cacheKey, customer, { ttl: 5 * 60 * 1000 }); // 5 minutes TTL
        
        return NextResponse.json(customer);
      } catch (error) {
        logger.error(`[${requestId}] Error getting customer:`, error);
        return NextResponse.json({ success: false, message: 'Error retrieving customer' }, { status: 500 });
      }
    } else {
      // Development mode - use mock database
      const customer = mockDb.customers.find(c => c.id === id);
      if (customer) {
        logger.info(`[${requestId}] Retrieved customer ${id} from mock database`);
        
        // Cache the result
        setCacheValue(cacheKey, customer, { ttl: 5 * 60 * 1000 }); // 5 minutes TTL
        
        return NextResponse.json(customer);
      }
      
      // Return a default customer for development
      const defaultCustomer = {
        id,
        business_name: 'Example Customer',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '(123) 456-7890',
        tenant_id: finalTenantId
      };
      
      logger.info(`[${requestId}] Returning default customer for development`);
      
      // Cache the default result
      setCacheValue(cacheKey, defaultCustomer, { ttl: 5 * 60 * 1000 }); // 5 minutes TTL
      
      return NextResponse.json(defaultCustomer);
    }
  } catch (error) {
    logger.error(`[${requestId}] Error processing customer get request:`, error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT handler for updating a customer with RLS
 */
export async function PUT(request, { params }) {
  const requestId = uuidv4();
  
  try {
    const { id } = params;
    logger.info(`[${requestId}] Updating customer with ID: ${id}`);
    
    // Extract tenant ID using the secure utility function
    const tenantInfo = await extractTenantId(request);
    
    // Use the same tenant ID extraction logic as the product API
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request for updating customer`);
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    // Get request body
    const body = await request.json();
    logger.debug(`[${requestId}] Update data for customer ${id}:`, body);
    
    // In production, use a database
    if (process.env.NODE_ENV === 'production' || process.env.USE_RDS === 'true') {
      try {
        // Import the RLS database utility
        const db = await import('@/utils/db/rls-database');
        
        // Update with transaction for consistency
        const updatedCustomer = await db.transaction(async (client, options) => {
          // Prepare update fields and values
          const updateFields = [];
          const values = [];
          let valueIndex = 1;
          
          // Map fields from request to database columns
          const fieldMappings = {
            'business_name': 'business_name',
            'customerName': 'business_name',
            'first_name': 'first_name',
            'last_name': 'last_name',
            'email': 'email',
            'phone': 'phone',
            'website': 'website',
            'street': 'street',
            'city': 'city',
            'state': 'state',
            'billingState': 'billing_state',
            'billingCountry': 'billing_country',
            'postcode': 'postcode',
            'country': 'country',
            'account_number': 'account_number',
            'notes': 'notes'
          };
          
          // Add each field if it exists in the request
          for (const [requestField, dbColumn] of Object.entries(fieldMappings)) {
            if (body[requestField] !== undefined) {
              updateFields.push(`${dbColumn} = $${valueIndex++}`);
              values.push(body[requestField]);
            }
          }
          
          // Always add updated_at 
          updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          
          // Add the ID as the last parameter
          values.push(id);
          
          // Skip update if no fields to update
          if (updateFields.length === 0) {
            logger.warn(`[${requestId}] No fields to update for customer ${id}`);
            
            // Just get the current customer
            const getQuery = `SELECT * FROM public.crm_customer WHERE id = $1`;
            const getResult = await client.query(getQuery, [id]);
            
            if (getResult.rows.length === 0) {
              return null; // Will be handled as 404 later
            }
            
            return getResult.rows[0];
          }
          
          // Execute the update with RLS
          const query = `
            UPDATE public.crm_customer
            SET ${updateFields.join(', ')}
            WHERE id = $${valueIndex}
            RETURNING *
          `;
          
          logger.info(`[${requestId}] Executing customer update with tenant context: ${finalTenantId}`);
          
          const result = await client.query(query, values);
          
          if (result.rows.length === 0) {
            return null; // Will be handled as 404 later
          }
          
          return result.rows[0];
        }, {
          requestId,
          tenantId: finalTenantId,
          debug: true
        });
        
        if (!updatedCustomer) {
          logger.warn(`[${requestId}] No customer found with ID ${id} for tenant ${finalTenantId}`);
          return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
        }
        
        logger.info(`[${requestId}] Customer ${id} updated successfully for tenant ${finalTenantId}`);
        
        // Invalidate caches
        setCacheValue(`customer_${finalTenantId}_${id}`, null);
        setCacheValue(`customers_${finalTenantId}`, null);
        
        return NextResponse.json(updatedCustomer);
      } catch (error) {
        logger.error(`[${requestId}] Error updating customer:`, error);
        return NextResponse.json({ 
          success: false, 
          message: 'Error updating customer',
          error: error.message
        }, { status: 500 });
      }
    } else {
      // Development mode - use mock database
      const index = mockDb.customers.findIndex(c => c.id === id);
      if (index !== -1) {
        // Update the customer in the mock DB
        mockDb.customers[index] = {
          ...mockDb.customers[index],
          ...body,
          updated_at: new Date().toISOString()
        };
        
        logger.info(`[${requestId}] Updated customer ${id} in mock database`);
        
        // Invalidate caches for development
        setCacheValue(`customer_${finalTenantId}_${id}`, null);
        setCacheValue(`customers_${finalTenantId}`, null);
        
        return NextResponse.json(mockDb.customers[index]);
      }
      
      // Return a default updated customer for development
      const updatedCustomer = {
        id,
        business_name: body.customer_name || body.business_name || 'Updated Customer',
        first_name: body.first_name || 'John',
        last_name: body.last_name || 'Doe',
        email: body.email || 'updated.email@example.com',
        phone: body.phone || '(123) 456-7890',
        tenant_id: finalTenantId,
        updated_at: new Date().toISOString()
      };
      
      logger.info(`[${requestId}] Returning default updated customer for development`);
      return NextResponse.json(updatedCustomer);
    }
  } catch (error) {
    logger.error(`[${requestId}] Error processing customer update request:`, error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
} 