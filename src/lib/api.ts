// API Client for The Vault
// Handles requests, authorization headers, and automated JWT token refresh logic.

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://the-vault-n7mz.onrender.com';
  
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

const handleLogout = () => {
  localStorage.removeItem('vault_user');
  localStorage.removeItem('vault_access_token');
  localStorage.removeItem('vault_refresh_token');
  // Redirect to login page
  window.location.href = '/login';
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request(url: string, options: RequestOptions = {}): Promise<any> {
  const accessToken = localStorage.getItem('vault_access_token');
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let query = '';
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      query = `?${queryString}`;
    }
  }

  const response = await fetch(`${BASE_URL}${url}${query}`, config);

  // If unauthorized, attempt token refresh
  if (response.status === 401) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      if (data.error === 'token_expired') {
        const refreshToken = localStorage.getItem('vault_refresh_token');
        if (!refreshToken) {
          handleLogout();
          throw new Error('Session expired');
        }

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshResponse = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}`,
              },
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const newAccessToken = refreshData.access_token;
              localStorage.setItem('vault_access_token', newAccessToken);
              isRefreshing = false;
              onRefreshed(newAccessToken);
            } else {
              isRefreshing = false;
              handleLogout();
              throw new Error('Session expired');
            }
          } catch (refreshErr) {
            isRefreshing = false;
            handleLogout();
            throw refreshErr;
          }
        }

        // Wait for the token to be refreshed
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            headers.set('Authorization', `Bearer ${newToken}`);
            resolve(
              fetch(`${BASE_URL}${url}${query}`, { ...config, headers }).then((res) => {
                if (!res.ok) {
                  return res.json().then((err) => Promise.reject(err));
                }
                return res.json();
              })
            );
          });
        });
      }
    } catch (e) {
      // JSON parsing or refresh failed, check if it was actually 401
    }

    // If it's a normal 401, return the error
    const errData = await response.json().catch(() => ({}));
    return Promise.reject(errData);
  }

  // Handle errors
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errData = await response.json();
      return Promise.reject(errData);
    }
    const errText = await response.text();
    return Promise.reject({ message: errText || 'Request failed' });
  }

  // Handle file downloads (PDF export)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return response.blob();
  }

  return response.json();
}

export const api = {
  get: (url: string, params?: Record<string, string>, options?: Omit<RequestOptions, 'method' | 'params'>) => 
    request(url, { ...options, method: 'GET', params }),
  post: (url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => 
    request(url, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => 
    request(url, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: (url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => 
    request(url, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (url: string, options?: Omit<RequestOptions, 'method'>) => 
    request(url, { ...options, method: 'DELETE' }),
};
