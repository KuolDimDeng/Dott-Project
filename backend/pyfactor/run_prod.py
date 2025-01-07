# /Users/kuoldeng/projectx/backend/pyfactor/run_prod.py

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "pyfactor.asgi:application",
        host="0.0.0.0",
        port=8000,
        reload=False,      # Disable reload in production
        log_level="info",
        workers=4,         # Adjust based on CPU cores
        access_log=True,
        proxy_headers=True # Important if running behind a proxy
    )