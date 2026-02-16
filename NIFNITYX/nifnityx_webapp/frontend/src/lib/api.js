import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const fetchDashboardStats = async (mode) => {
    return api.get(`/trade/stats?mode=${mode}`);
};

export const fetchMarketStatus = async () => {
    return api.get('/broker/market-status');
};

export const fetchHistoricalData = async (interval = "ONE_MINUTE") => {
    return api.get(`/broker/history?interval=${interval}`);
};

export const fetchTrades = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.mode) params.append("mode", filters.mode);
    if (filters.limit) params.append("limit", filters.limit);
    return api.get(`/trade?${params.toString()}`);
};

export const updateStrategyConfig = async (config) => {
    return api.put('/auth/strategy', config);
};

export const updateCapital = async (capital) => {
    return api.put('/auth/capital', { capital });
};

export const fetchAccountSummary = async () => {
    return api.get('/trade/account-summary');
};

export const fetchAnalytics = async (params) => {
    return api.get('/trade/analytics', { params });
};

export default api;