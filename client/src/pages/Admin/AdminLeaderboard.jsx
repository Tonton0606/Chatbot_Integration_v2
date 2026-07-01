import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../../components/admin/ui';
import { Trophy, Medal, TrendingUp, Star, Users } from 'lucide-react';

export default function AdminLeaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hermes_leaderboard') || '[]');
      setLeaders(saved);
    } catch {}
    setLoading(false);
  }, []);

  const rankIcons = [Trophy, Medal, Star];
  const rankColors = ['text-[var(--brand-gold)]', 'text-[var(--text-muted)]', 'text-[var(--brand-gold)]'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">Leaderboard</h1>
      <p className="text-sm text-[var(--text-muted)]">Top performers based on deals closed, revenue generated, and activity levels</p>

      {leaders.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <Trophy className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Leaderboard Data Yet</h3>
          <p className="text-sm text-[var(--text-muted)]">Leaderboard rankings will appear here once deals are being closed and tracked through the system.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {leaders.map((person, idx) => {
            const Icon = rankIcons[idx] || Users;
            return (
              <Card key={person.id || idx}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={'w-10 h-10 rounded-full flex items-center justify-center ' + (rankColors[idx] || 'text-[var(--text-muted)]')}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{person.name || 'Team Member'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{person.role || 'Sales'} • {person.deals || 0} deals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[var(--text-primary)]">${(person.revenue || 0).toLocaleString()}</p>
                    <Badge variant={person.trend === 'up' ? 'success' : 'default'}>{person.trend === 'up' ? '↑ Rising' : 'Stable'}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}