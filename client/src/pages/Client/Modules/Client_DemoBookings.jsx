import { useEffect, useState, useCallback } from 'react';
import Client_Layout from '../../Components/Client_Components/Client_Layout.jsx';
import { supabase } from '../../../config/supabaseClient';
import { Loader2, Calendar, Clock, Video, CheckCircle, XCircle, Clock3, ExternalLink } from 'lucide-react';

function Client_DemoBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setError('Please log in to view your bookings');
        return;
      }
      setUser(currentUser);

      // Fetch user's bookings
      const { data, error: fetchError } = await supabase
        .from('demo_bookings')
        .select('*')
        .eq('email', currentUser.email)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBookings(data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock3 className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Client_Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">My Demo Bookings</h1>
            <p className="text-white/60">View and manage your scheduled demo sessions</p>
          </div>
          <button
            onClick={loadBookings}
            disabled={loading}
            className="px-4 py-2 bg-[#0d1525] border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#c9a84c]" />
            <span className="ml-3 text-white/60">Loading your bookings...</span>
          </div>
        )}

        {/* Bookings List */}
        {!loading && bookings.length === 0 && !error && (
          <div className="text-center py-20 bg-[#0d1525] border border-white/10 rounded-xl">
            <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No bookings yet</h3>
            <p className="text-white/50 mb-6">You haven't booked any demos. Book one from the landing page!</p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#c9a84c] text-black font-medium rounded-lg hover:bg-[#b8963f] transition-colors"
            >
              Book a Demo
            </a>
          </div>
        )}

        {!loading && bookings.length > 0 && (
          <div className="grid gap-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-[#0d1525] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      {getStatusIcon(booking.status)}
                      <h3 className="text-lg font-semibold text-white">{booking.full_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <Calendar className="w-4 h-4 text-[#c9a84c]" />
                        <span>{formatDate(booking.preferred_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Clock className="w-4 h-4 text-[#c9a84c]" />
                        <span>{booking.preferred_time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Video className="w-4 h-4 text-[#c9a84c]" />
                        <span className="capitalize">{booking.platform || 'Zoom'}</span>
                      </div>
                    </div>

                    {/* Company & Email */}
                    <div className="text-sm text-white/50 mb-3">
                      <span className="text-white/70">{booking.company}</span>
                      <span className="mx-2">•</span>
                      <span>{booking.email}</span>
                    </div>

                    {/* Meeting Link (if approved) */}
                    {booking.status === 'approved' && booking.zoom_join_url && (
                      <a
                        href={booking.zoom_join_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Join Meeting
                      </a>
                    )}

                    {/* Admin Notes */}
                    {booking.admin_notes && (
                      <div className="mt-4 p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-white/40 mb-1">Admin Notes:</p>
                        <p className="text-sm text-white/70">{booking.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Booking ID */}
                  <div className="text-xs text-white/30 font-mono">
                    #{booking.id?.slice(0, 8)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Client_Layout>
  );
}

export default Client_DemoBookings;
