const API = '/api';

function getHeaders(token) {
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export const publicApi = {
  departments: () => fetch(`${API}/departments`).then(r => r.json()),
  employees: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${API}/employees?${q}`).then(r => r.json());
  },
  employee: (id) => fetch(`${API}/employees/${id}`).then(r => r.json())
};

export const adminApi = (token) => ({
  login: (u, p) => fetch(`${API}/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: u, password: p })
  }).then(r => { if(!r.ok) throw new Error('Auth failed'); return r.json(); }),
  employees: () => fetch(`${API}/admin/employees`, { headers: getHeaders(token) }).then(r => r.json()),
  createEmployee: (data) => fetch(`${API}/admin/employees`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify(data) }).then(r => r.json()),
  updateEmployee: (id, data) => fetch(`${API}/admin/employees/${id}`, { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(data) }).then(r => r.json()),
  deleteEmployee: (id) => fetch(`${API}/admin/employees/${id}`, { method: 'DELETE', headers: getHeaders(token) }),
  deleteDepartment: (name) => fetch(`${API}/admin/departments/${encodeURIComponent(name)}`, { method: 'DELETE', headers: getHeaders(token) }).then(r => r.json())
});
