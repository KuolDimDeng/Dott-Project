"""
Database CRUD Operations Logger
Tracks all database operations with RLS context
"""

import json
import time
import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import psycopg2

# Configure logger
logger = logging.getLogger('crud_logger')
logger.setLevel(logging.INFO)

# Create console handler if not exists
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - [CRUD_LOGGER] - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class DatabaseCRUDLogger:
    def __init__(self):
        self.session_id = f"db_session_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        self.operation_counter = 0

    def get_next_operation_id(self) -> str:
        self.operation_counter += 1
        return f"db_op_{self.operation_counter}_{int(time.time())}"

    def log_rls_setup(self, operation_id: str, tenant_id: str, user_id: str = None):
        """Log RLS context setup"""
        log_data = {
            'operation_id': operation_id,
            'session_id': self.session_id,
            'timestamp': datetime.utcnow().isoformat(),
            'level': 'RLS_SETUP',
            'tenant_id': tenant_id,
            'user_id': user_id,
            'rls_context': f'tenant_{tenant_id}',
            'action': 'SET_RLS_CONTEXT'
        }
        
        print(f"\n🔐 [RLS_SETUP] Setting context for tenant: {tenant_id}")
        print(f"   Operation ID: {operation_id}")
        print(f"   User ID: {user_id}")
        print(f"   RLS Context: tenant_{tenant_id}")
        
        logger.info(f"[RLS_SETUP] {json.dumps(log_data)}")

    def log_query_execution(self, operation_id: str, tenant_id: str, table: str, 
                          operation: str, query: str, params: tuple = None,
                          user_id: str = None):
        """Log SQL query execution"""
        log_data = {
            'operation_id': operation_id,
            'session_id': self.session_id,
            'timestamp': datetime.utcnow().isoformat(),
            'level': 'QUERY_EXECUTION',
            'tenant_id': tenant_id,
            'user_id': user_id,
            'table': table,
            'operation': operation.upper(),
            'query': self._sanitize_query(query),
            'param_count': len(params) if params else 0,
            'rls_enabled': True,
            'schema': f'tenant_{tenant_id}' if tenant_id else 'public'
        }
        
        print(f"\n💾 [QUERY_EXECUTION] {operation.upper()} on {table}")
        print(f"   Operation ID: {operation_id}")
        print(f"   Tenant ID: {tenant_id}")
        print(f"   Table: {table}")
        print(f"   Schema: {log_data['schema']}")
        print(f"   Query: {self._sanitize_query(query)}")
        
        logger.info(f"[QUERY_EXECUTION] {json.dumps(log_data)}")

    def log_query_result(self, operation_id: str, tenant_id: str, table: str,
                        operation: str, result: Any, row_count: int = 0,
                        execution_time: float = None, error: Exception = None):
        """Log query execution result"""
        log_data = {
            'operation_id': operation_id,
            'session_id': self.session_id,
            'timestamp': datetime.utcnow().isoformat(),
            'level': 'QUERY_ERROR' if error else 'QUERY_SUCCESS',
            'tenant_id': tenant_id,
            'table': table,
            'operation': operation.upper(),
            'row_count': row_count,
            'execution_time_ms': round(execution_time * 1000, 2) if execution_time else None,
            'success': error is None,
            'error': {
                'message': str(error),
                'type': error.__class__.__name__,
                'code': getattr(error, 'pgcode', None)
            } if error else None,
            'rls_policy_applied': True,
            'schema': f'tenant_{tenant_id}' if tenant_id else 'public'
        }
        
        if error:
            print(f"\n❌ [QUERY_ERROR] {operation.upper()} failed on {table}")
            print(f"   Operation ID: {operation_id}")
            print(f"   Tenant ID: {tenant_id}")
            print(f"   Error: {str(error)}")
            print(f"   Error Code: {getattr(error, 'pgcode', 'N/A')}")
        else:
            print(f"\n✅ [QUERY_SUCCESS] {operation.upper()} on {table}")
            print(f"   Operation ID: {operation_id}")
            print(f"   Tenant ID: {tenant_id}")
            print(f"   Rows Affected: {row_count}")
            print(f"   Execution Time: {log_data['execution_time_ms']}ms")
        
        logger.info(f"[QUERY_RESULT] {json.dumps(log_data)}")

    def log_rls_violation(self, operation_id: str, tenant_id: str, table: str,
                         attempted_operation: str, user_id: str = None,
                         violation_details: str = None):
        """Log RLS policy violation"""
        log_data = {
            'operation_id': operation_id,
            'session_id': self.session_id,
            'timestamp': datetime.utcnow().isoformat(),
            'level': 'RLS_VIOLATION',
            'tenant_id': tenant_id,
            'user_id': user_id,
            'table': table,
            'attempted_operation': attempted_operation.upper(),
            'violation_details': violation_details,
            'rls_policy': f'rls_policy_{table}_{tenant_id}',
            'action': 'ACCESS_DENIED'
        }
        
        print(f"\n🚫 [RLS_VIOLATION] Access denied")
        print(f"   Operation ID: {operation_id}")
        print(f"   Tenant ID: {tenant_id}")
        print(f"   User ID: {user_id}")
        print(f"   Table: {table}")
        print(f"   Attempted: {attempted_operation.upper()}")
        print(f"   Details: {violation_details}")
        
        logger.error(f"[RLS_VIOLATION] {json.dumps(log_data)}")

    def log_connection_info(self, operation_id: str, tenant_id: str,
                          connection_info: Dict[str, Any]):
        """Log database connection information"""
        log_data = {
            'operation_id': operation_id,
            'session_id': self.session_id,
            'timestamp': datetime.utcnow().isoformat(),
            'level': 'CONNECTION_INFO',
            'tenant_id': tenant_id,
            'database': connection_info.get('database'),
            'host': connection_info.get('host'),
            'port': connection_info.get('port'),
            'user': connection_info.get('user'),
            'rls_enabled': True,
            'connection_id': connection_info.get('connection_id')
        }
        
        print(f"\n🔌 [CONNECTION_INFO] Database connection")
        print(f"   Operation ID: {operation_id}")
        print(f"   Tenant ID: {tenant_id}")
        print(f"   Database: {log_data['database']}")
        print(f"   Host: {log_data['host']}")
        print(f"   Connection ID: {log_data['connection_id']}")
        
        logger.info(f"[CONNECTION_INFO] {json.dumps(log_data)}")

    def log_transaction_start(self, operation_id: str, tenant_id: str, isolation_level: str = None):
        """Log transaction start"""
        log_data = {
            'operation_id': operation_id,
            'session_id': self.session_id,
            'timestamp': datetime.utcnow().isoformat(),
            'level': 'TRANSACTION_START',
            'tenant_id': tenant_id,
            'isolation_level': isolation_level,
            'action': 'BEGIN_TRANSACTION'
        }
        
        print(f"\n🔄 [TRANSACTION_START] Beginning transaction")
        print(f"   Operation ID: {operation_id}")
        print(f"   Tenant ID: {tenant_id}")
        print(f"   Isolation Level: {isolation_level}")
        
        logger.info(f"[TRANSACTION_START] {json.dumps(log_data)}")

    def log_transaction_end(self, operation_id: str, tenant_id: str, 
                          committed: bool, error: Exception = None):
        """Log transaction end"""
        log_data = {
            'operation_id': operation_id,
            'session_id': self.session_id,
            'timestamp': datetime.utcnow().isoformat(),
            'level': 'TRANSACTION_END',
            'tenant_id': tenant_id,
            'action': 'COMMIT' if committed else 'ROLLBACK',
            'success': committed,
            'error': str(error) if error else None
        }
        
        if committed:
            print(f"\n✅ [TRANSACTION_COMMIT] Transaction committed")
        else:
            print(f"\n❌ [TRANSACTION_ROLLBACK] Transaction rolled back")
            if error:
                print(f"   Error: {str(error)}")
        
        print(f"   Operation ID: {operation_id}")
        print(f"   Tenant ID: {tenant_id}")
        
        logger.info(f"[TRANSACTION_END] {json.dumps(log_data)}")

    def _sanitize_query(self, query: str) -> str:
        """Sanitize SQL query for logging"""
        if not query:
            return ""
        
        # Remove extra whitespace and newlines
        clean_query = " ".join(query.split())
        
        # Limit length for readability
        if len(clean_query) > 200:
            clean_query = clean_query[:200] + "..."
        
        return clean_query

    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of current session"""
        return {
            'session_id': self.session_id,
            'total_operations': self.operation_counter,
            'timestamp': datetime.utcnow().isoformat()
        }

# Create singleton instance
db_crud_logger = DatabaseCRUDLogger()

def log_crud_operation(func):
    """Decorator for logging CRUD operations"""
    def wrapper(*args, **kwargs):
        operation_id = db_crud_logger.get_next_operation_id()
        tenant_id = kwargs.get('tenant_id') or getattr(args[0], 'tenant_id', 'unknown') if args else 'unknown'
        
        start_time = time.time()
        
        try:
            # Log operation start
            func_name = func.__name__
            table = kwargs.get('table') or getattr(args[0], 'table_name', 'unknown')
            
            db_crud_logger.log_query_execution(
                operation_id=operation_id,
                tenant_id=tenant_id,
                table=table,
                operation=func_name,
                query=f"Executing {func_name}",
                user_id=kwargs.get('user_id')
            )
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Log success
            execution_time = time.time() - start_time
            row_count = len(result) if isinstance(result, list) else 1
            
            db_crud_logger.log_query_result(
                operation_id=operation_id,
                tenant_id=tenant_id,
                table=table,
                operation=func_name,
                result=result,
                row_count=row_count,
                execution_time=execution_time
            )
            
            return result
            
        except Exception as e:
            # Log error
            execution_time = time.time() - start_time
            
            db_crud_logger.log_query_result(
                operation_id=operation_id,
                tenant_id=tenant_id,
                table=table,
                operation=func_name,
                result=None,
                row_count=0,
                execution_time=execution_time,
                error=e
            )
            
            raise e
    
    return wrapper