-- 1. Check tables that have RLS enabled
SELECT
    n.nspname AS schema,
    c.relname AS table,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_force_enabled
FROM
    pg_class c
JOIN
    pg_namespace n ON c.relnamespace = n.oid
WHERE
    c.relkind = 'r' -- only tables
    AND c.relrowsecurity = true
ORDER BY
    n.nspname, c.relname;

-- 2. Check RLS policies defined for tables
SELECT
    n.nspname AS schema,
    c.relname AS table,
    p.polname AS policy_name,
    p.polcmd AS command_type,
    p.polpermissive AS permissive,
    pg_get_expr(p.polqual, p.polrelid) AS policy_definition,
    pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
FROM
    pg_policy p
JOIN
    pg_class c ON p.polrelid = c.oid
JOIN
    pg_namespace n ON c.relnamespace = n.oid
ORDER BY
    n.nspname, c.relname, p.polname;

-- 3. Check if the RLS tenant session variable is set
SHOW rls.tenant_id;

-- 4. See what tables have tenant_id column (likely RLS enforced)
SELECT
    n.nspname AS schema,
    c.relname AS table,
    a.attname AS column_name,
    format_type(a.atttypid, a.atttypmod) AS data_type
FROM
    pg_attribute a
JOIN
    pg_class c ON a.attrelid = c.oid
JOIN
    pg_namespace n ON c.relnamespace = n.oid
WHERE
    a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname = 'tenant_id'
    AND c.relkind = 'r'
ORDER BY
    n.nspname, c.relname;

-- 5. Check example data with tenant IDs for one table (inventory_product)
SELECT
    id,
    name,
    tenant_id,
    created_at
FROM
    inventory_product
LIMIT 10;
