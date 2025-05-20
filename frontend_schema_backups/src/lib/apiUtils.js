// /src/lib/apiUtils.js
export const URLUtil = {
    formatUrl: (url, baseUrl) => {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const cleanPath = url.replace(/^\/+/, '').replace(/\/+$/, '');
        return `${cleanBaseUrl}/${cleanPath}/`;
    },

    isValidUrl: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
};

export const APIUtils = {
    getBaseUrl: () => {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) {
            throw new Error('API base URL is not configured');
        }
        return baseUrl.replace(/\/+$/, '');
    },

    constructEndpoint: (path) => {
        if (!path) {
            throw new Error('API endpoint path is required');
        }
        const normalizedPath = path.startsWith('/api/') ? path : `/api/${path}`;
        return normalizedPath.replace(/^\/+/, '');
    },

    constructUrl: (endpoint) => {
        const baseUrl = APIUtils.getBaseUrl();
        const normalizedEndpoint = APIUtils.constructEndpoint(endpoint);
        return `${baseUrl}/${normalizedEndpoint}`;
    }
};