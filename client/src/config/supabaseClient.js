import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// SECURITY: a service-role / secret key (sb_secret_*) must NEVER be used in the
// browser — it bypasses Row Level Security and would expose all tenant data.
// Reject it loudly rather than silently shipping it in the client bundle.
if (supabaseAnonKey && supabaseAnonKey.startsWith('sb_secret_')) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is a secret key (sb_secret_*). Never expose a secret/service-role key to the browser. Use the publishable anon key.'
  );
}

// Support new sb_publishable_ format and legacy eyJ... JWT (anon) format.
const isValidKey = supabaseAnonKey && (
  supabaseAnonKey.startsWith('sb_publishable_') ||
  supabaseAnonKey.startsWith('eyJ')
);

const MISSING_SUPABASE_ERROR = new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

const noopQuery = {
  select: () => noopQuery,
  insert: () => noopQuery,
  update: () => noopQuery,
  upsert: () => noopQuery,
  delete: () => noopQuery,
  eq: () => noopQuery,
  neq: () => noopQuery,
  gt: () => noopQuery,
  gte: () => noopQuery,
  lt: () => noopQuery,
  lte: () => noopQuery,
  like: () => noopQuery,
  ilike: () => noopQuery,
  order: () => noopQuery,
  limit: () => noopQuery,
  range: () => noopQuery,
  in: () => noopQuery,
  or: () => noopQuery,
  filter: () => noopQuery,
  not: () => noopQuery,
  is: () => noopQuery,
  contains: () => noopQuery,
  single: async () => ({ data: null, error: MISSING_SUPABASE_ERROR }),
  maybeSingle: async () => ({ data: null, error: null }),
};

const noopAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  signInWithPassword: async () => ({ data: null, error: MISSING_SUPABASE_ERROR }),
  signUp: async () => ({ data: null, error: MISSING_SUPABASE_ERROR }),
  signOut: async () => ({ data: null, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  resetPasswordForEmail: async () => ({ data: null, error: MISSING_SUPABASE_ERROR }),
};

if (!supabaseUrl || !isValidKey) {
  console.warn('Supabase environment variables are not configured. Live auth/data will not be available in preview.');
}

export const supabase = supabaseUrl && isValidKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : { auth: noopAuth, from: () => noopQuery };

// Database helpers
export const db = {
  // Users
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  async getAllProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Customers (CRM)
  async getCustomers(filters = {}) {
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    const status = filters.status?.trim();
    const search = filters.search?.trim();

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(200, filters.pageSize || 50);
    const rangeStart = (page - 1) * pageSize;
    query = query.range(rangeStart, rangeStart + pageSize - 1);

    const { data, error, count } = await query;
    return { data, error, count, page, pageSize };
  },

  async getCustomer(id) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createCustomer(customer) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();
    return { data, error };
  },

  async updateCustomer(id, updates) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteCustomer(id) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Documents (ERP)
  async getDemoBookings(filters = {}) {
    let query = supabase
      .from('demo_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const status = filters.status?.trim();
    const search = filters.search?.trim();

    if (status && status !== 'all') {
      if (status === 'demo_done') {
        query = query.in('status', ['demo_done', 'converted']);
      } else {
        query = query.eq('status', status);
      }
    }

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    return { data, error };
  },

  async updateDemoBooking(id, updates) {
    const { data, error } = await supabase
      .from('demo_bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async deleteDemoBooking(id) {
    const { error } = await supabase
      .from('demo_bookings')
      .delete()
      .eq('id', id);

    return { error };
  },

  async getProjects(filters = {}) {
    let query = supabase
      .from('projects')
      .select('*, customers(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false });

    const status = filters.status?.trim();
    const search = filters.search?.trim();

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(
        `project_name.ilike.%${search}%,modules_included.ilike.%${search}%,assigned_member.ilike.%${search}%`
      );
    }

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(200, filters.pageSize || 50);
    const rangeStart = (page - 1) * pageSize;
    query = query.range(rangeStart, rangeStart + pageSize - 1);

    const { data, error, count } = await query;
    return { data, error, count, page, pageSize };
  },

  async createProject(project) {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select('*, customers(name, email)')
      .single();

    return { data, error };
  },

  async updateProject(id, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select('*, customers(name, email)')
      .single();

    return { data, error };
  },

  async deleteProject(id) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    return { error };
  },

  async getDocuments(filters = {}) {
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(200, filters.pageSize || 50);
    const rangeStart = (page - 1) * pageSize;
    query = query.range(rangeStart, rangeStart + pageSize - 1);

    const { data, error, count } = await query;
    return { data, error, count, page, pageSize };
  },

  async getDocument(id) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createDocument(document) {
    const { data, error } = await supabase
      .from('documents')
      .insert(document)
      .select()
      .single();
    return { data, error };
  },

  async updateDocument(id, updates) {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteDocument(id) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Metrics (Analytics)
  async getMetrics(timeRange = '7d') {
    const startDate = new Date(Date.now() - timeRangeToMs(timeRange)).toISOString();

    const { data, error } = await supabase
      .from('metrics')
      .select('*')
      .gte('recorded_at', startDate)
      .order('recorded_at', { ascending: false });

    return { data, error };
  },

  async getMetricByName(metricName, timeRange = '7d') {
    const startDate = new Date(Date.now() - timeRangeToMs(timeRange)).toISOString();

    const { data, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('metric_name', metricName)
      .gte('recorded_at', startDate)
      .order('recorded_at', { ascending: false });

    return { data, error };
  },

  async createMetric(metric) {
    const { data, error } = await supabase
      .from('metrics')
      .insert(metric)
      .select()
      .single();
    return { data, error };
  },

  async getAggregatedMetrics(timeRange = '7d') {
    const startDate = new Date(Date.now() - timeRangeToMs(timeRange)).toISOString();

    const { data, error } = await supabase
      .from('metrics')
      .select('metric_name, value')
      .gte('recorded_at', startDate);

    if (error) return { data: null, error };

    // Aggregate by metric name
    const aggregated = {};
    (data || []).forEach((metric) => {
      if (!aggregated[metric.metric_name]) {
        aggregated[metric.metric_name] = { count: 0, sum: 0, values: [] };
      }
      aggregated[metric.metric_name].count++;
      aggregated[metric.metric_name].sum += parseFloat(metric.value);
      aggregated[metric.metric_name].values.push(parseFloat(metric.value));
    });

    // Calculate averages
    const result = {};
    Object.keys(aggregated).forEach((name) => {
      result[name] = {
        average: aggregated[name].sum / aggregated[name].count,
        total: aggregated[name].sum,
        count: aggregated[name].count,
        latest: aggregated[name].values[aggregated[name].values.length - 1]
      };
    });

    return { data: result, error: null };
  },

  // Security Logs
  async logSecurityEvent(action, userId, details = {}) {
    const { error } = await supabase
      .from('security_logs')
      .insert({
        action,
        user_id: userId,
        details,
        ip_address: details.ip_address || null,
        user_agent: details.user_agent || null
      });
    return { error };
  },

  async getSecurityLogs(filters = {}) {
    let query = supabase
      .from('security_logs')
      .select('*, profiles:profiles(full_name, email)')
      .order('created_at', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Real-time subscriptions
  subscribeToCustomers(callback) {
    return supabase
      .channel('customers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, callback)
      .subscribe();
  },

  subscribeToDemoBookings(callback) {
    return supabase
      .channel('demo_bookings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_bookings' }, callback)
      .subscribe();
  },

  subscribeToProjects(callback) {
    return supabase
      .channel('projects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, callback)
      .subscribe();
  },

  subscribeToDocuments(callback) {
    return supabase
      .channel('documents_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, callback)
      .subscribe();
  },

  subscribeToMetrics(callback) {
    return supabase
      .channel('metrics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metrics' }, callback)
      .subscribe();
  }
};

function timeRangeToMs(range) {
  const map = {
    '1h': 3600000,
    '24h': 86400000,
    '1d': 86400000,
    '7d': 604800000,
    '30d': 2592000000,
    '90d': 7776000000
  };
  return map[range] || 604800000;
}

// Utility functions
export const utils = {
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  formatDateTime(date) {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  },

  formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
  },

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};
