'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { Loader2, Database } from 'lucide-react';

export default function SystemStatusPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('system');
  const [initializingDb, setInitializingDb] = useState(false);
  const [initDbResult, setInitDbResult] = useState(null);
  const [initializingRls, setInitializingRls] = useState(false);
  const [initRlsResult, setInitRlsResult] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/system-status');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch system status:', err);
      setError(err.message || 'Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setInitializingDb(true);
    setInitDbResult(null);
    setError(null);
    
    try {
      // Get tenant ID from cookies or localStorage
      const tenantId = 
        document.cookie.split('; ').find(row => row.startsWith('tenantId='))?.split('=')[1] ||
        document.cookie.split('; ').find(row => row.startsWith('businessid='))?.split('=')[1] ||
        localStorage.getItem('tenantId');
      
      if (!tenantId) {
        throw new Error('No tenant ID found in cookies or localStorage');
      }
      
      const response = await fetch(`/api/debug/database/create-tables?tenantId=${tenantId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setInitDbResult(data);
      
      // After initializing, refresh the status
      await fetchStatus();
      
    } catch (err) {
      console.error('Failed to initialize database:', err);
      setError(err.message || 'Failed to initialize database');
    } finally {
      setInitializingDb(false);
    }
  };

  const initializeRLS = async () => {
    setInitializingRls(true);
    setInitRlsResult(null);
    setError(null);
    
    try {
      // Get tenant ID from cookies or localStorage
      const tenantId = 
        document.cookie.split('; ').find(row => row.startsWith('tenantId='))?.split('=')[1] ||
        document.cookie.split('; ').find(row => row.startsWith('businessid='))?.split('=')[1] ||
        localStorage.getItem('tenantId');
      
      if (!tenantId) {
        throw new Error('No tenant ID found in cookies or localStorage');
      }
      
      const response = await fetch(`/api/debug/database/initialize-rls?tenantId=${tenantId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setInitRlsResult(data);
      
      // After initializing, refresh the status
      await fetchStatus();
      
    } catch (err) {
      console.error('Failed to initialize RLS:', err);
      setError(err.message || 'Failed to initialize RLS');
    } finally {
      setInitializingRls(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    seconds %= (3600 * 24);
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    
    return `${days}d ${hours}h ${minutes}m ${Math.floor(seconds)}s`;
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500">Connected</Badge>;
      case 'error':
        return <Badge className="bg-red-500">Error</Badge>;
      default:
        return <Badge className="bg-yellow-500">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">System Status</h1>
        <div className="grid gap-6">
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">System Status</h1>
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchStatus} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Status</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={initializeRLS} 
            variant="secondary" 
            size="sm"
            disabled={initializingRls || loading}
          >
            {initializingRls ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing RLS...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Initialize RLS
              </>
            )}
          </Button>
          <Button 
            onClick={initializeDatabase} 
            variant="secondary" 
            size="sm"
            disabled={initializingDb || loading}
          >
            {initializingDb ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing Database...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Initialize Database
              </>
            )}
          </Button>
          <Button onClick={fetchStatus} variant="outline" size="sm" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </div>
      
      {initRlsResult && (
        <Alert className="mb-6" variant="success">
          <CheckCircledIcon className="h-4 w-4" />
          <AlertTitle>RLS Initialized</AlertTitle>
          <AlertDescription>
            <p>{initRlsResult.message}</p>
            <p className="text-sm mt-2">RLS is {initRlsResult.rlsVerified ? 'working correctly' : 'NOT working correctly'}</p>
            <p className="text-sm">Created tables: {initRlsResult.tables.join(', ')}</p>
          </AlertDescription>
        </Alert>
      )}
      
      {initDbResult && (
        <Alert className="mb-6" variant="success">
          <CheckCircledIcon className="h-4 w-4" />
          <AlertTitle>Database Initialized</AlertTitle>
          <AlertDescription>
            <p>{initDbResult.message}</p>
            <p className="text-sm mt-2">Created tables: {initDbResult.tables.join(', ')}</p>
          </AlertDescription>
        </Alert>
      )}
      
      {status && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Environment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {status.system?.env || 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {status.system?.platform} ({status.system?.release})
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {status.system?.memory?.percentFree}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(status.system?.memory?.free)} free of {formatBytes(status.system?.memory?.total)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {renderStatusBadge(status.database?.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {status.database?.schemas?.length || 0} schemas, 
                  {status.database?.productTables?.length || 0} product tables
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Server Uptime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatUptime(status.system?.uptime)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last check: {new Date(status.timestamp).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="env">Environment</TabsTrigger>
            </TabsList>
            
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium">Hostname</dt>
                      <dd>{status.system?.hostname}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium">Platform</dt>
                      <dd>{status.system?.platform} {status.system?.release}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium">CPUs</dt>
                      <dd>{status.system?.cpus} cores</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium">Memory</dt>
                      <dd>{formatBytes(status.system?.memory?.total)} ({status.system?.memory?.percentFree} free)</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium">Uptime</dt>
                      <dd>{formatUptime(status.system?.uptime)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium">Environment</dt>
                      <dd>{status.system?.env}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="database" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Database Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span> 
                      {renderStatusBadge(status.database?.status)}
                    </div>
                    {status.database?.message && (
                      <p className="text-sm mt-1">{status.database?.message}</p>
                    )}
                    {status.database?.timestamp && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Server time: {new Date(status.database?.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  {status.database?.status === 'error' ? (
                    <Alert variant="destructive" className="mb-4">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <AlertTitle>Database Error</AlertTitle>
                      <AlertDescription>
                        <p>{status.database?.message}</p>
                        {status.database?.code && (
                          <p className="text-sm mt-1">Error code: {status.database?.code}</p>
                        )}
                        {status.database?.stack && (
                          <pre className="text-xs mt-2 overflow-auto p-2 bg-slate-800 text-white rounded">
                            {status.database?.stack}
                          </pre>
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium mb-2">Schemas</h3>
                      <div className="overflow-auto max-h-60 mb-4">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Schema
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Table Count
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {status.database?.schemas?.map((schema, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {schema.schema_name}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {schema.table_count}
                                </td>
                              </tr>
                            ))}
                            {!status.database?.schemas?.length && (
                              <tr>
                                <td colSpan="2" className="px-3 py-2 text-sm text-center text-gray-500">
                                  No schemas found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      <h3 className="text-lg font-medium mb-2">Product Tables</h3>
                      <div className="overflow-auto max-h-60 mb-4">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Schema
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Table
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Columns
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {status.database?.productTables?.map((table, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {table.table_schema}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {table.table_name}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {table.column_count}
                                </td>
                              </tr>
                            ))}
                            {!status.database?.productTables?.length && (
                              <tr>
                                <td colSpan="3" className="px-3 py-2 text-sm text-center text-gray-500">
                                  No product tables found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {status.database?.sampleProducts && Object.keys(status.database.sampleProducts).length > 0 && (
                        <>
                          <h3 className="text-lg font-medium mb-2">Sample Products</h3>
                          {Object.entries(status.database.sampleProducts).map(([schema, products]) => (
                            <div key={schema} className="mb-4">
                              <h4 className="text-md font-medium mb-1">{schema}</h4>
                              {Array.isArray(products) && products.length > 0 ? (
                                <div className="overflow-auto max-h-60">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {products.map((product, i) => (
                                        <tr key={i}>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {product.id || 'N/A'}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                            {product.name || 'N/A'}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                            {product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'N/A'}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                            {product.created_at ? new Date(product.created_at).toLocaleString() : 'N/A'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <Alert>
                                  <AlertTitle>No products found</AlertTitle>
                                  <AlertDescription>
                                    {products.error ? `Error: ${products.error}` : 'No product data available for this schema.'}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium">package.json</dt>
                      <dd className="mt-1">
                        {status.config?.package ? (
                          <div className="text-sm">
                            <div><span className="font-medium">Name:</span> {status.config.package.name}</div>
                            <div><span className="font-medium">Version:</span> {status.config.package.version}</div>
                            <div><span className="font-medium">Dependencies:</span> {status.config.package.dependencies}</div>
                            <div><span className="font-medium">Dev Dependencies:</span> {status.config.package.devDependencies}</div>
                          </div>
                        ) : status.config?.package?.error ? (
                          <span className="text-red-500">{status.config.package.error}</span>
                        ) : (
                          <span className="text-gray-500">Not found</span>
                        )}
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium">db.config.json</dt>
                      <dd className="mt-1">
                        {status.config?.dbConfig?.exists ? (
                          <div className="text-sm">
                            <div><span className="font-medium">Connection String:</span> {status.config.dbConfig.connectionString || 'Not set'}</div>
                            <div><span className="font-medium">SSL:</span> {status.config.dbConfig.ssl?.toString() || 'Not set'}</div>
                            <div><span className="font-medium">Max Connections:</span> {status.config.dbConfig.max || 'Not set'}</div>
                          </div>
                        ) : status.config?.dbConfig?.error ? (
                          <span className="text-red-500">{status.config.dbConfig.error}</span>
                        ) : (
                          <span className="text-yellow-500">Not found</span>
                        )}
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium">next.config.js</dt>
                      <dd className="mt-1">
                        {status.config?.nextConfig?.exists ? (
                          <span className="text-green-500">Found</span>
                        ) : status.config?.nextConfig?.error ? (
                          <span className="text-red-500">{status.config.nextConfig.error}</span>
                        ) : (
                          <span className="text-yellow-500">Not found</span>
                        )}
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium">Environment Files</dt>
                      <dd className="mt-1 grid grid-cols-2 gap-2">
                        {['.env', '.env.local', '.env.development', '.env.production'].map(file => (
                          <div key={file} className="text-sm">
                            <span className="font-medium">{file}:</span>{' '}
                            {status.config?.[file]?.exists ? (
                              <span className="text-green-500">Found</span>
                            ) : status.config?.[file]?.error ? (
                              <span className="text-red-500">{status.config[file].error}</span>
                            ) : (
                              <span className="text-gray-500">Not found</span>
                            )}
                          </div>
                        ))}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="env" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Environment Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Variable
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(status.environment || {}).map(([key, value]) => (
                          <tr key={key}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {key}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {value}
                            </td>
                          </tr>
                        ))}
                        {Object.keys(status.environment || {}).length === 0 && (
                          <tr>
                            <td colSpan="2" className="px-3 py-2 text-sm text-center text-gray-500">
                              No environment variables available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-sm text-muted-foreground">
            <p>Request ID: {status.requestId}</p>
            <p>Generated at: {new Date(status.timestamp).toLocaleString()}</p>
          </div>
        </>
      )}
    </div>
  );
} 