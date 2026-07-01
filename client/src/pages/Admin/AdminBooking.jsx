import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton
} from "../../components/admin/ui";
import { Calendar, Clock, Video, MapPin, Plus, ChevronLeft, ChevronRight, User, X } from "lucide-react";
import { supabase } from "../../config/supabaseClient";
import AdminBookingModal from "../../components/admin/AdminBookingModal";
import { useLocation } from "react-router-dom";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STATUS_COLORS = {
  confirmed: "bg-[var(--success-soft)] text-[var(--success)]",
  approved: "bg-[var(--success-soft)] text-[var(--success)]",
  pending: "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
  new: "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
  cancelled: "bg-[var(--danger-soft)] text-[var(--danger)]",
  rejected: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export default function AdminBooking() {
  const today = new Date();
  const location = useLocation();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [focusedBookingId, setFocusedBookingId] = useState(null);

  // Action Modal State
  const [actionModal, setActionModal] = useState({
    open: false,
    type: null,
    booking: null,
    notes: '',
    submitting: false,
  });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else setCurrentMonth(m => m + 1);
  };

  useEffect(() => {
    fetchBookings();

    // Realtime subscription — auto-refresh on any change
    const channel = supabase
      .channel('demo_bookings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_bookings' }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentMonth, currentYear]);

  // Handle focus on specific booking from navigation
  useEffect(() => {
    if (location.state?.focusBookingId) {
      setFocusedBookingId(location.state.focusBookingId);
      window.history.replaceState({}, document.title);

      const timer = setTimeout(() => {
        const pendingSection = document.getElementById('pending-bookings-section');
        if (pendingSection) {
          pendingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

          const focusedElement = document.getElementById(`booking-${location.state.focusBookingId}`);
          if (focusedElement) {
            focusedElement.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2');
            setTimeout(() => {
              focusedElement.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2');
            }, 3000);
          }
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);

      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(currentYear, currentMonth + 2, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('demo_bookings')
        .select('*')
        .gte('preferred_date', startOfMonth)
        .lte('preferred_date', endOfMonth)
        .order('preferred_date');

      if (error) throw error;

      console.log('Fetched bookings:', data); // ← check your console
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBookingModal = () => setShowBookingModal(true);
  const handleCloseBookingModal = () => setShowBookingModal(false);
  const handleBookingSuccess = () => fetchBookings();

  // Action Modal Handlers
  const openActionModal = (type, booking) => {
    if (type === 'approve') {
      const now = new Date();
      const bookingDateTime = parseBookingDateTime(booking.preferred_date, booking.preferred_time);

      // Check 1: Past date/time
      if (bookingDateTime < now) {
        alert(
          `⚠️ Cannot Approve\n\n"${booking.full_name}" was scheduled for ${booking.preferred_date} at ${booking.preferred_time}, which is already in the past.\n\nThe reject form will open so you can notify the client.`
        );
        setActionModal({ open: true, type: 'reject', booking, notes: `Your requested time slot (${booking.preferred_date} at ${booking.preferred_time}) has already passed. Please rebook at an available future time.`, submitting: false });
        return;
      }

      // Check 2: Conflict with an already approved booking
      const conflictingBooking = bookings.find((b) => {
        if (b.id === booking.id) return false;
        if (b.status !== 'approved') return false;
        if (b.preferred_date !== booking.preferred_date) return false;
        const diffMs = Math.abs(parseBookingDateTime(b.preferred_date, b.preferred_time) - bookingDateTime);
        return diffMs < 30 * 60 * 1000;
      });

      if (conflictingBooking) {
        alert(
          `⚠️ Time Slot Unavailable\n\n"${conflictingBooking.full_name}" already has an approved booking on ${conflictingBooking.preferred_date} at ${conflictingBooking.preferred_time}.\n\nThis slot is taken. The reject form will open so you can ask the client to rebook.`
        );
        setActionModal({ open: true, type: 'reject', booking, notes: `Your requested time slot (${booking.preferred_date} at ${booking.preferred_time}) is currently unavailable as another meeting is already scheduled at that time. Please rebook at a different time.`, submitting: false });
        return;
      }
    }

    // No conflicts — open normally
    setActionModal({ open: true, type, booking, notes: booking.admin_message || '', submitting: false });
  };

  const closeActionModal = () => {
    setActionModal({ open: false, type: null, booking: null, notes: '', submitting: false });
  };

  // ---- place this ABOVE the filter block ----
  const parseBookingDateTime = (date, time) => {
    if (!time) return new Date(`${date}T00:00:00`);
    if (/^\d{2}:\d{2}/.test(time)) return new Date(`${date}T${time}`);
    const [t, meridiem] = time.split(' ');
    let [hours, minutes] = t.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  };

  // ---- then remove the duplicate parseBookingDateTime inside Action Modal Handlers ----

  const handleActionSubmit = async () => {
    const { type, booking, notes } = actionModal;

    if (!notes.trim()) {
      alert('Please add a note before submitting.');
      return;
    }

    setActionModal((prev) => ({ ...prev, submitting: true }));

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const endpoint = type === 'approve'
        ? `${API_BASE}/zoom/approve/${booking.id}`
        : `${API_BASE}/zoom/reject/${booking.id}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_message: notes.trim() }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `Failed to ${type} booking.`);

      closeActionModal();
      await fetchBookings();
    } catch (error) {
      console.error('Action error:', error);
      alert('Error: ' + error.message);
      setActionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Filter bookings
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const approvedBookings = bookings.filter((b) => {
    if (b.status !== 'approved') return false;
    const bookingDateTime = parseBookingDateTime(b.preferred_date, b.preferred_time);
    return bookingDateTime >= now && bookingDateTime <= next24h;
  });


  const pendingBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'new' || !b.status);
  const todayBookings = bookings.filter((b) =>
    (b.preferred_date || b.date) === selectedDate
  );

  const bookedDates = new Set(bookings.map(b => b.preferred_date || b.date));


  const formatDate = (dateStr) => {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric"
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Booking</h2>
          <p className="text-muted-foreground">Schedule and manage client meetings and appointments.</p>
        </div>
        <Button onClick={handleOpenBookingModal}><Plus className="h-4 w-4 mr-2" /> New Booking</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[340px,1fr]">
        {/* Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="font-semibold">{MONTHS[currentMonth]} {currentYear}</span>
              <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = dateStr === selectedDate;
                const hasBooking = bookedDates.has(dateStr);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-9 w-9 mx-auto rounded-full text-sm flex items-center justify-center relative transition-colors
                      ${isSelected ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted"}
                    `}
                  >
                    {day}
                    {hasBooking && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Appointments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{formatDate(selectedDate)}</h3>
            <Badge variant="outline">{todayBookings.length} appointment{todayBookings.length !== 1 ? "s" : ""}</Badge>
          </div>

          {isLoading ? (
            <Card><CardContent className="py-12">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent></Card>
          ) : todayBookings.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No bookings for this day</CardContent></Card>
          ) : (
            todayBookings.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${b.meeting_type === "video" || b.platform === "zoom" ? "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}>
                    {b.meeting_type === "video" || b.platform === "zoom" ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold">{b.full_name || b.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {b.preferred_time || b.time}
                            {b.duration && ` (${b.duration} min)`}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {b.attendees?.length
                              ? `${b.attendees.length} attendee${b.attendees.length !== 1 ? "s" : ""}`
                              : "2 attendees"}
                          </span>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[b.status]}>{b.status}</Badge>
                    </div>

                    {/* Attendee badges — show attendees array, or fall back to full_name + Admin */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {b.attendees?.length
                        ? b.attendees.map((attendee, idx) => (
                          <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-full">{attendee}</span>
                        ))
                        : (
                          <>
                            <span className="text-xs bg-muted px-2 py-1 rounded-full">{b.full_name}</span>
                            <span className="text-xs bg-muted px-2 py-1 rounded-full">Admin</span>
                          </>
                        )
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Info Cards Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Approved Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-[var(--brand-gold)]" />
              Upcoming Meetings <span className="text-xs font-normal text-muted-foreground">(next 24h)</span>
              <Badge variant="outline">{approvedBookings.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No approved meetings scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvedBookings.map((booking) => {
                  const meetingLink = booking.platform === 'zoom'
                    ? booking.zoom_join_url
                    : booking.meet_link;
                  return (
                    <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border bg-[var(--success-soft)] border-[var(--success)]">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{booking.full_name}</div>
                        <div className="text-xs text-muted-foreground">{booking.preferred_date} at {booking.preferred_time}</div>
                        <div className="text-xs text-muted-foreground">{booking.company || 'No company'}</div>
                      </div>
                      {meetingLink && (
                        <a
                          href={meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          title="Join Meeting"
                        >
                          <Video className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Bookings */}
        <Card id="pending-bookings-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--brand-gold)]" />
              Pending Approval
              <Badge variant="outline">{pendingBookings.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No bookings pending approval</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    id={`booking-${booking.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-[var(--brand-gold-soft)] border-[var(--brand-gold)] transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{booking.full_name}</div>
                      <div className="text-xs text-muted-foreground">{booking.preferred_date} at {booking.preferred_time}</div>
                      <div className="text-xs text-muted-foreground">{booking.company || 'No company'}</div>
                    </div>
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => openActionModal('approve', booking)}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        title="Approve Booking"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openActionModal('reject', booking)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        title="Reject Booking"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Booking Modal */}
      <AdminBookingModal
        isOpen={showBookingModal}
        onClose={handleCloseBookingModal}
        onSuccess={handleBookingSuccess}
      />

      {/* Action Modal (Approve/Reject) */}
      {actionModal.open && actionModal.booking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {actionModal.type === 'approve' ? 'Approve Booking' : 'Reject Booking'}
              </h3>
              <button
                onClick={closeActionModal}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Booking Summary */}
            <div className="bg-muted border border-border rounded-lg p-4 mb-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Name: </span><span>{actionModal.booking.full_name}</span></div>
                <div><span className="text-muted-foreground">Email: </span><span>{actionModal.booking.email}</span></div>
                <div><span className="text-muted-foreground">Date: </span><span>{actionModal.booking.preferred_date}</span></div>
                <div><span className="text-muted-foreground">Time: </span><span>{actionModal.booking.preferred_time}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {actionModal.type === 'approve' ? 'Message to Client' : 'Reason for Rejection'} *
                </label>
                <textarea
                  rows={3}
                  value={actionModal.notes}
                  onChange={(e) => setActionModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={
                    actionModal.type === 'approve'
                      ? 'We are pleased to confirm your demo. Please check your email for the meeting link.'
                      : 'The requested time slot is unavailable. Please rebook at a different time.'
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeActionModal}
                  disabled={actionModal.submitting}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionSubmit}
                  disabled={actionModal.submitting}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${actionModal.type === 'approve'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                >
                  {actionModal.submitting ? 'Processing...' : (actionModal.type === 'approve' ? 'Approve & Send' : 'Reject & Notify')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}