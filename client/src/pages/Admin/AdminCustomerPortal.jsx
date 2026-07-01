import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/admin/ui';
import { Users, ExternalLink, Settings, Shield, Clock } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

export default function AdminCustomerPortal() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('customer_portal_access').select('*, client:clients(*)');
        setClients(data || []);
      } catch { setClients([]); }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Customer Portal</h1><p className="text-sm text-gray-500">Manage client portal access and activity</p></div>
        <Button icon={ExternalLink}>Open Portal</Button>
      </div>
      <Card><CardContent className="text-center py-12">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Customer Portal Management</h3>
        <p className="text-sm text-gray-500">Grant clients access to their personalized portal where they can view projects, submit requests, and track progress.</p>
      </CardContent></Card>
    </div>
  );
}