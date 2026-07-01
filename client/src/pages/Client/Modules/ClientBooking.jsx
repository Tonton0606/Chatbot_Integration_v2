import { useEffect, useMemo, useState } from "react";

import ClientBookingAvailabilityPanel from "../../../components/client/booking/ClientBookingAvailabilityPanel.jsx";

import {
  BookingCalendar,
  BookingDaySection,
  BookingHeader,
  BookingStats,
  PendingApprovalList,
  UpcomingMeetingsList,
} from "../../../components/client/layout/Client_Booking_Components.jsx";

import ClientBookingIntegrations from "../../../components/client/layout/Client_BookingIntegrations.jsx";
import ClientBookingModal from "../../../components/client/modals/ClientBookingModal.jsx";
import RebookBookingModal from "../../../components/client/modals/RebookBookingModal.jsx";

import {
  approveClientBooking,
  createClientBooking,
  getBookingCollections,
  getClientBookingFormOptions,
  getClientBookings,
  rebookClientBooking,
  rejectClientBooking,
  resolveClientWorkspaceId,
} from "../../../services/clientBookings";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const BOOKING_TABS = [
  {
    key: "calendar",
    label: "Calendar",
  },
  {
    key: "pending",
    label: "Pending",
  },
  {
    key: "availability",
    label: "Availability",
  },
  {
    key: "integrations",
    label: "Integrations",
  },
];

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let index = 0; index < firstDay; index += 1) {
    days.push({ date: "", fullDate: "", empty: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      date: day,
      fullDate: `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`,
      empty: false,
    });
  }

  return days;
}

function buildDefaultRebookForm(booking) {
  return {
    preferred_date: booking?.preferred_date || "",
    preferred_time: booking?.preferred_time || "",
    reschedule_reason: "",
  };
}

function BookingTabs({ activeTab, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2 shadow-sm">
      {BOOKING_TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              isActive
                ? "bg-[var(--brand-gold)] text-black"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ClientBooking() {
  const today = new Date();

  const [workspaceId, setWorkspaceId] = useState(null);
  const [activeTab, setActiveTab] = useState("calendar");

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().slice(0, 10)
  );

  const [bookings, setBookings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [showRebookModal, setShowRebookModal] = useState(false);
  const [rebookBooking, setRebookBooking] = useState(null);
  const [rebookForm, setRebookForm] = useState(buildDefaultRebookForm());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;

  const calendarDays = useMemo(() => {
    return buildCalendarDays(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const {
    approvedBookings,
    pendingBookings,
    selectedDateBookings,
    bookedDates,
  } = useMemo(() => {
    return getBookingCollections(bookings, selectedDate);
  }, [bookings, selectedDate]);

  useEffect(() => {
    loadBookingData();
  }, []);

  async function loadBookingData() {
    try {
      setLoading(true);
      setError("");

      const activeWorkspaceId =
        workspaceId || (await resolveClientWorkspaceId());

      setWorkspaceId(activeWorkspaceId);

      const [bookingRows, options] = await Promise.all([
        getClientBookings(activeWorkspaceId),
        getClientBookingFormOptions(activeWorkspaceId),
      ]);

      setBookings(bookingRows || []);
      setContacts(options.contacts || []);
      setEmployees(options.employees || []);
      setCurrentUser(options.currentUser || null);
    } catch (err) {
      console.error("Client booking load error:", err);
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
      return;
    }

    setCurrentMonth((month) => month - 1);
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
      return;
    }

    setCurrentMonth((month) => month + 1);
  }

  function openCreateModal() {
    setSelectedBooking(null);
    setShowModal(true);
  }

  function closeModal() {
    setSelectedBooking(null);
    setShowModal(false);
  }

  function openRebookModal(booking) {
    setRebookBooking(booking);
    setRebookForm(buildDefaultRebookForm(booking));
    setShowRebookModal(true);
  }

  function closeRebookModal() {
    setRebookBooking(null);
    setRebookForm(buildDefaultRebookForm());
    setShowRebookModal(false);
  }

  function updateRebookField(key, value) {
    setRebookForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleCreateBooking(payload) {
    try {
      setSaving(true);

      if (!workspaceId) {
        throw new Error("Workspace ID is missing.");
      }

      await createClientBooking(workspaceId, payload);

      closeModal();
      await loadBookingData();
    } catch (err) {
      console.error("Client booking create error:", err);
      alert(err.message || "Failed to create booking.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveBooking(booking) {
    const confirmed = window.confirm(
      `Approve "${booking.title}"?\n\nThis will automatically generate the ${
        booking.platform === "google_meet" ? "Google Meet" : "Zoom"
      } meeting link using this workspace's connected account.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      await approveClientBooking(booking.id, {
        client_message: "Your booking has been approved.",
      });

      await loadBookingData();
    } catch (err) {
      console.error("Client booking approve error:", err);
      alert(err.message || "Failed to approve booking.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRejectBooking(booking) {
    const reason = window.prompt(
      `Reject "${booking.title}"?\n\nEnter rejection reason.`
    );

    if (!reason) return;

    try {
      setSaving(true);

      await rejectClientBooking(booking.id, reason);
      await loadBookingData();
    } catch (err) {
      console.error("Client booking reject error:", err);
      alert(err.message || "Failed to reject booking.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRebookSubmit(event) {
    event.preventDefault();

    if (!rebookBooking) return;

    try {
      setSaving(true);

      await rebookClientBooking(rebookBooking.id, {
        preferred_date: rebookForm.preferred_date,
        preferred_time: rebookForm.preferred_time,
        reschedule_reason: rebookForm.reschedule_reason,
      });

      closeRebookModal();
      await loadBookingData();
    } catch (err) {
      console.error("Client booking rebook error:", err);
      alert(err.message || "Failed to rebook booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <BookingHeader
        monthLabel={monthLabel}
        onPrevMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onCreate={openCreateModal}
      />

      <BookingTabs activeTab={activeTab} onChange={setActiveTab} />

      {loading && activeTab !== "availability" && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Loading bookings...
          </p>
        </div>
      )}

      {!loading && error && activeTab !== "availability" && (
        <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load bookings
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>

          <button
            type="button"
            onClick={loadBookingData}
            className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && activeTab === "calendar" && (
        <>
          <BookingStats bookings={bookings} />

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <BookingCalendar
              calendarDays={calendarDays}
              selectedDate={selectedDate}
              bookedDates={bookedDates}
              onSelectDate={setSelectedDate}
            />

            <BookingDaySection
              selectedDate={selectedDate}
              bookings={selectedDateBookings}
            />
          </div>

          <UpcomingMeetingsList bookings={approvedBookings} />
        </>
      )}

      {!loading && !error && activeTab === "pending" && (
        <PendingApprovalList
          bookings={pendingBookings}
          saving={saving}
          onApprove={handleApproveBooking}
          onReject={handleRejectBooking}
          onRebook={openRebookModal}
        />
      )}

      {activeTab === "availability" && (
        <ClientBookingAvailabilityPanel workspaceId={workspaceId} />
      )}

      {!loading && !error && activeTab === "integrations" && (
        <ClientBookingIntegrations />
      )}

      {showModal && (
        <ClientBookingModal
          isOpen={showModal}
          currentUser={currentUser}
          contacts={contacts}
          employees={employees}
          saving={saving}
          booking={selectedBooking}
          onClose={closeModal}
          onSubmit={handleCreateBooking}
        />
      )}

      {showRebookModal && (
        <RebookBookingModal
          booking={rebookBooking}
          form={rebookForm}
          saving={saving}
          onChange={updateRebookField}
          onClose={closeRebookModal}
          onSubmit={handleRebookSubmit}
        />
      )}
    </div>
  );
}
