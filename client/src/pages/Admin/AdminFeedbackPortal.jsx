import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/admin/ui';
import { MessageSquare, ThumbsUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

export default function AdminFeedbackPortal() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('feedback_entries').select('*').order('created_at', { ascending: false });
        setFeedbacks(data || []);
      } catch { setFeedbacks([]); }
      setLoading(false);
    }
    load();
  }, []);

  const typeColors = { suggestion: 'info', bug: 'error', complaint: 'warning', praise: 'success' };
  const statusColors = { open: 'warning', in_review: 'info', resolved: 'success', closed: 'default' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback Portal</h1>
      <p className="text-sm text-gray-500">Collect and manage client feedback, suggestions, and issues</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold">{feedbacks.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Open</p><p className="text-2xl font-bold text-amber-500">{feedbacks.filter(f => f.status === 'open').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Resolved</p><p className="text-2xl font-bold text-green-500">{feedbacks.filter(f => f.status === 'resolved').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Urgent</p><p className="text-2xl font-bold text-red-500">{feedbacks.filter(f => f.priority === 'urgent').length}</p></CardContent></Card>
      </div>

      {feedbacks.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Feedback Yet</h3>
          <p className="text-sm text-gray-500">Client feedback entries will appear here as they are submitted through the portal.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map(f => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold">{f.title}</h3>
                      <Badge variant={typeColors[f.type] || 'default'}>{f.type}</Badge>
                      <Badge variant={statusColors[f.status] || 'default'}>{f.status?.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{f.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(f.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}