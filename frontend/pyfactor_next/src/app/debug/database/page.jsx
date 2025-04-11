'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Box, Paper, Alert, CircularProgress, 
         Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DatabaseDebugPage() {
  const [tenantId, setTenantId] = useState('');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [directSqlResult, setDirectSqlResult] = useState('');
  const [requestLog, setRequestLog] = useState([]);
  const [schemaName, setSchemaName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('SELECT NOW() as time');
  const [tableName, setTableName] = useState('products');
  const [result, setResult] = useState(null);
  
  // Initialize with tenant ID from localStorage
  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId') || localStorage.getItem('businessid');
    if (storedTenantId) {
      setTenantId(storedTenantId);
      // Generate schema name
      const schema = `tenant_${storedTenantId.replace(/-/g, '_')}`;
      setSchemaName(schema);
    }
  }, []);
  
  // Add to request log
  const logRequest = (action, details) => {
    const timestamp = new Date().toISOString();
    setRequestLog(prev => [{timestamp, action, details}, ...prev.slice(0, 19)]);
  };
  
  // Fetch products to debug API
  const fetchProducts = async () => {
    if (!tenantId) {
      setError('Tenant ID is required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      logRequest('fetchProducts', `Starting request with tenantId: ${tenantId}`);
      
      const response = await axios.get('/api/products', {
        params: {
          schema: schemaName,
          tenantId: tenantId,
          debug: true
        },
        headers: {
          'X-Tenant-ID': tenantId,
          'X-Debug-Mode': 'true' 
        }
      });
      
      logRequest('fetchProducts', `Response status: ${response.status}`);
      
      if (response.data) {
        setProducts(Array.isArray(response.data) ? response.data : []);
        setSuccess(`Successfully fetched ${Array.isArray(response.data) ? response.data.length : 0} products`);
      }
    } catch (error) {
      setError(`Error fetching products: ${error.message}`);
      logRequest('fetchProducts', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a test product
  const createTestProduct = async () => {
    if (!tenantId) {
      setError('Tenant ID is required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    const testProduct = {
      name: `Test Product ${new Date().toISOString()}`,
      description: 'Created for debugging purposes',
      price: 19.99,
      for_sale: true,
      for_rent: false,
      stock_quantity: 100,
      reorder_level: 10,
      tenant_id: tenantId
    };
    
    try {
      logRequest('createTestProduct', `Creating test product with tenantId: ${tenantId}`);
      
      const response = await axios.post('/api/products', testProduct, {
        params: {
          schema: schemaName,
          tenantId: tenantId,
          debug: true
        },
        headers: {
          'X-Tenant-ID': tenantId,
          'X-Debug-Mode': 'true'
        }
      });
      
      logRequest('createTestProduct', `Response status: ${response.status}`);
      
      if (response.data) {
        setSuccess(`Successfully created test product: ${response.data.name || response.data.product_name}`);
        // Refresh product list
        fetchProducts();
      }
    } catch (error) {
      setError(`Error creating test product: ${error.message}`);
      logRequest('createTestProduct', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Run direct database query (for development mode)
  const runDirectDatabaseQuery = async () => {
    if (!tenantId) {
      setError('Tenant ID is required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      logRequest('runDirectDatabaseQuery', `Running direct query for schema: ${schemaName}`);
      
      const response = await axios.post('/api/debug/database-query', {
        schema: schemaName,
        tenant_id: tenantId,
        query: "SELECT * FROM information_schema.tables WHERE table_schema LIKE $1",
        params: [`tenant_%`]
      }, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });
      
      logRequest('runDirectDatabaseQuery', `Response status: ${response.status}`);
      
      if (response.data) {
        setDirectSqlResult(JSON.stringify(response.data, null, 2));
        setSuccess('Query executed successfully');
      }
    } catch (error) {
      setError(`Error executing direct query: ${error.message}`);
      logRequest('runDirectDatabaseQuery', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check system status
  const checkSystemStatus = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      logRequest('checkSystemStatus', 'Checking system status');
      
      const response = await axios.get('/api/debug/system-status');
      
      logRequest('checkSystemStatus', `Response status: ${response.status}`);
      
      if (response.data) {
        setDirectSqlResult(JSON.stringify(response.data, null, 2));
        setSuccess('System status checked successfully');
      }
    } catch (error) {
      setError(`Error checking system status: ${error.message}`);
      logRequest('checkSystemStatus', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Execute custom SQL query
  const executeSqlQuery = async () => {
    if (!sqlQuery.trim()) {
      setError('SQL query is required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      logRequest('executeSqlQuery', `Executing SQL: ${sqlQuery.substring(0, 50)}...`);
      
      const response = await axios.post('/api/debug/database-query', {
        query: sqlQuery,
        schema: schemaName,
        tenant_id: tenantId
      }, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });
      
      logRequest('executeSqlQuery', `Response status: ${response.status}`);
      
      if (response.data) {
        setResult(response.data);
        setSuccess('SQL query executed successfully');
      }
    } catch (error) {
      setError(`Error executing SQL query: ${error.message}`);
      logRequest('executeSqlQuery', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fix issues - try to create products table if missing
  const createProductsTable = async () => {
    if (!tenantId) {
      setError('Tenant ID is required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      logRequest('createProductsTable', `Creating products table in schema: ${schemaName}`);
      
      // Create schema if it doesn't exist
      const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS ${schemaName}`;
      await axios.post('/api/debug/database-query', {
        query: createSchemaQuery,
        schema: schemaName,
        tenant_id: tenantId
      });
      
      // Create products table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${schemaName}.products (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          product_name VARCHAR(255),
          description TEXT,
          price DECIMAL(10, 2) DEFAULT 0,
          stock_quantity INTEGER DEFAULT 0,
          reorder_level INTEGER DEFAULT 0,
          for_sale BOOLEAN DEFAULT TRUE,
          for_rent BOOLEAN DEFAULT FALSE,
          tenant_id VARCHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      await axios.post('/api/debug/database-query', {
        query: createTableQuery,
        schema: schemaName,
        tenant_id: tenantId
      });
      
      logRequest('createProductsTable', 'Table created successfully');
      setSuccess('Products table created successfully');
      
      // Refresh the table list
      await runDirectDatabaseQuery();
    } catch (error) {
      setError(`Error creating products table: ${error.message}`);
      logRequest('createProductsTable', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkConnection = async () => {
    setCheckingConnection(true);
    setConnectionStatus(null);
    setError(null);
    
    try {
      const response = await axios.get('/api/debug/system-status');
      
      if (!response.data) {
        throw new Error('Failed to check connection');
      }
      
      setConnectionStatus(response.data);
    } catch (err) {
      console.error('Error checking connection:', err);
      setError(err.message);
    } finally {
      setCheckingConnection(false);
    }
  };
  
  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Database Debug Tools</h1>
        <Button 
          onClick={checkConnection} 
          variant="outline" 
          disabled={checkingConnection}
        >
          {checkingConnection ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking Connection...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Check Connection
            </>
          )}
        </Button>
      </div>
      
      {connectionStatus && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Database Connection Status
              {connectionStatus.status === 'connected' ? (
                <Badge className="bg-green-500">Connected</Badge>
              ) : (
                <Badge className="bg-red-500">Error</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectionStatus.status === 'connected' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Connected to database successfully</span>
                </div>
                {connectionStatus.timestamp && (
                  <div className="text-sm">
                    Server time: {new Date(connectionStatus.timestamp).toLocaleString()}
                  </div>
                )}
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">Available Schemas</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {connectionStatus.schemas?.map((schema, i) => (
                      <div key={i} className="text-sm">
                        <span 
                          className={`font-medium cursor-pointer hover:text-blue-500 ${schemaName === schema.schema_name ? 'text-blue-600' : ''}`}
                          onClick={() => setSchemaName(schema.schema_name)}
                        >
                          {schema.schema_name}
                        </span>
                        <span className="text-gray-500 ml-2">({schema.table_count} tables)</span>
                      </div>
                    ))}
                  </div>
                </div>
                {connectionStatus.productTables?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-md font-medium mb-2">Product Tables</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {connectionStatus.productTables?.map((table, i) => (
                        <div key={i} className="text-sm">
                          <span 
                            className={`font-medium cursor-pointer hover:text-blue-500 ${
                              schemaName === table.table_schema && tableName === table.table_name ? 'text-blue-600' : ''
                            }`}
                            onClick={() => {
                              setSchemaName(table.table_schema);
                              setTableName(table.table_name);
                            }}
                          >
                            {table.table_schema}.{table.table_name}
                          </span>
                          <span className="text-gray-500 ml-2">({table.column_count} columns)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>{connectionStatus.message || 'Failed to connect to database'}</span>
                </div>
                {connectionStatus.code && (
                  <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                    Error code: {connectionStatus.code}
                  </div>
                )}
                {connectionStatus.stack && (
                  <div className="text-xs font-mono bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {connectionStatus.stack}
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkConnection}
              disabled={checkingConnection}
            >
              Refresh Status
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="query">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="query">Execute SQL Query</TabsTrigger>
          <TabsTrigger value="create">Create Products Table</TabsTrigger>
        </TabsList>
        
        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execute SQL Query</CardTitle>
              <CardDescription>
                Run SQL queries directly against the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schema">Schema</Label>
                    <Input
                      id="schema"
                      placeholder="Schema name"
                      value={schemaName}
                      onChange={(e) => setSchemaName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="query">SQL Query</Label>
                  <Textarea
                    id="query"
                    placeholder="Enter your SQL query"
                    className="min-h-[100px] font-mono"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={executeSqlQuery} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : 'Execute Query'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Products Table</CardTitle>
              <CardDescription>
                Create a new products table in the specified schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-schema">Schema</Label>
                    <Input
                      id="create-schema"
                      placeholder="Schema name"
                      value={schemaName}
                      onChange={(e) => setSchemaName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="table">Table Name</Label>
                    <Input
                      id="table"
                      placeholder="Table name"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-md text-sm">
                  <p>This will create a products table with the following columns:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>id (UUID, primary key)</li>
                    <li>name (VARCHAR)</li>
                    <li>description (TEXT)</li>
                    <li>price (NUMERIC)</li>
                    <li>stock_quantity (INTEGER)</li>
                    <li>tenant_id (VARCHAR)</li>
                    <li>created_at (TIMESTAMP)</li>
                    <li>updated_at (TIMESTAMP)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={createProductsTable} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : 'Create Table'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.message && (
                <div className="text-sm bg-gray-50 p-4 rounded-md">
                  {result.message}
                </div>
              )}
              
              {result.rows && (
                <div className="overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {result.rows.length > 0 && 
                          Object.keys(result.rows[0]).map((column, i) => (
                            <th 
                              key={i} 
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {column}
                            </th>
                          ))
                        }
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.rows.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((value, j) => (
                            <td key={j} className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {value === null ? 
                                <span className="text-gray-400 italic">null</span> : 
                                String(value)
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {result.sql && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-1">Executed SQL:</h3>
                  <pre className="text-xs p-2 bg-gray-50 rounded overflow-auto">{result.sql}</pre>
                </div>
              )}
              
              {result.duration && (
                <div className="text-xs text-gray-500">
                  Query executed in {result.duration.toFixed(2)}ms
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 