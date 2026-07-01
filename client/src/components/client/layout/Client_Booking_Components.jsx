import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  Plus,
  User,
  Users,
  Video,
  XCircle,
} from "lucide-react";

import {
  CLIENT_BOOKING_STATUS_STYLES,
  formatBookingDate,
  formatShortDate,
  formatTime,
} from "../../../services/clientBookings";

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const iconBoxClass =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function BookingHeader({
  monthLabel,
  onPrevMonth,
  onNextMonth,
  onCreate,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Client Workspace
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Booking
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Schedule, approve, and manage workspace meetings with contacts,
          employees, or external recipients.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2 shadow-sm">
          <button
            type="button"
            onClick={onPrevMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="min-w-[150px] text-center text-sm font-bold text-[var(--text-primary)]">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={onNextMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-11 items-center rounded-2xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black shadow-sm transition hover:opacity-90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </button>
      </div>
    </div>
  );
}

export function BookingCalendar({
  calendarDays,
  selectedDate,
  bookedDates,
  onSelectDate,
}) {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={`${panelClass} p-5`}>
      <div className="mb-4 flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
        <Calendar className="h-5 w-5 text-[var(--brand-gold)]" />

        <h3 className="font-bold text-[var(--text-primary)]">
          Calendar
        </h3>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const isSelected = selectedDate === day.fullDate;
          const hasBooking = day.fullDate && bookedDates.has(day.fullDate);

          if (day.empty) {
            return <div key={`empty-${index}`} className="h-10" />;
          }

          return (
            <button
              key={day.fullDate}
              type="button"
              onClick={() => onSelectDate(day.fullDate)}
              className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${
                isSelected
                  ? "bg-[var(--brand-gold)] text-black"
                  : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              {day.date}

              {hasBooking && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--brand-gold)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingDaySection({
  selectedDate,
  bookings = [],
  onArchive,
}) {
  return (
    <div className={`${panelClass} p-5`}>
      <div className="mb-5 flex flex-col gap-2 border-b border-[var(--border-color)] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-[var(--text-primary)]">
            {formatBookingDate(selectedDate)}
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Daily appointment schedule
          </p>
        </div>

        <span className="w-fit rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
          {bookings.length} appointment{bookings.length !== 1 ? "s" : ""}
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-10 text-center">
          <Calendar className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            No bookings for this day.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onArchive={onArchive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function BookingCard({ booking, onArchive }) {
  const statusClass =
    CLIENT_BOOKING_STATUS_STYLES[booking.status] ||
    CLIENT_BOOKING_STATUS_STYLES.pending;

  const PlatformIcon = booking.platform === "zoom" ? Video : MapPin;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4 transition hover:border-[var(--brand-gold-border)]">
      <div className="flex items-start gap-4">
        <div className={iconBoxClass}>
          <PlatformIcon className="h-5 w-5 text-[var(--brand-gold)]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h4 className="truncate font-bold text-[var(--text-primary)]">
                {booking.title}
              </h4>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {booking.creator_name || booking.full_name}
              </p>
            </div>

            <span
              className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${statusClass}`}
            >
              {booking.status}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(booking.preferred_time)}
            </span>

            <span className="inline-flex items-center gap-1">
              <Video className="h-4 w-4" />
              {booking.platform === "google_meet" ? "Google Meet" : "Zoom"}
            </span>

            <span className="inline-flex items-center gap-1">
              {booking.booking_mode === "multiple" ? (
                <Users className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
              {booking.booking_mode === "multiple"
                ? `${booking.recipients?.length || 0} recipients`
                : booking.recipient_name || "No recipient"}
            </span>
          </div>

          <RecipientPreview booking={booking} />

          <div className="mt-4 flex flex-wrap gap-2">
            {booking.meeting_link && (
              <a
                href={booking.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[var(--brand-gold)] px-3 py-2 text-xs font-bold text-black hover:opacity-90"
              >
                Join Meeting
              </a>
            )}

            {onArchive && (
              <button
                type="button"
                onClick={() => onArchive(booking)}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecipientPreview({ booking }) {
  if (booking.booking_mode === "multiple") {
    const recipients = booking.recipients || [];

    return (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {recipients.length === 0 ? (
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
            No recipients
          </span>
        ) : (
          recipients.slice(0, 5).map((recipient) => (
            <span
              key={`${recipient.type}-${recipient.email}`}
              className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
            >
              {recipient.name || recipient.email}
            </span>
          ))
        )}

        {recipients.length > 5 && (
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
            +{recipients.length - 5} more
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
        <Mail className="h-3 w-3" />
        {booking.recipient_email || "No recipient email"}
      </span>
    </div>
  );
}

export function UpcomingMeetingsList({ bookings = [] }) {
  return (
    <div className={`${panelClass} p-5`}>
      <div className="mb-5 flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-[var(--brand-gold)]" />

          <div>
            <h3 className="font-bold text-[var(--text-primary)]">
              Upcoming Meetings
            </h3>

            <p className="text-xs text-[var(--text-muted)]">
              Approved meetings within the next 24 hours
            </p>
          </div>
        </div>

        <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
          {bookings.length}
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-8 text-center">
          <Video className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            No approved meetings scheduled.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-xl border border-green-500/20 bg-[var(--success-soft)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--text-primary)]">
                    {booking.title}
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {formatShortDate(booking.preferred_date)} at{" "}
                    {formatTime(booking.preferred_time)}
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {booking.creator_name || booking.full_name}
                  </p>
                </div>

                {booking.meeting_link && (
                  <a
                    href={booking.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--brand-gold)] text-black hover:opacity-90"
                    title="Join Meeting"
                  >
                    <Video className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PendingApprovalList({
  bookings = [],
  saving,
  onApprove,
  onReject,
  onRebook,
  onArchive,
}) {
  return (
    <div className={`${panelClass} p-5`}>
      <div className="mb-5 flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[var(--brand-gold)]" />

          <div>
            <h3 className="font-bold text-[var(--text-primary)]">
              Pending Approval
            </h3>

            <p className="text-xs text-[var(--text-muted)]">
              New and rescheduled booking requests awaiting confirmation
            </p>
          </div>
        </div>

        <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
          {bookings.length}
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-8 text-center">
          <Clock className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            No bookings pending approval.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-[var(--text-primary)]">
                      {booking.title}
                    </p>

                    {booking.status === "rescheduled" && (
                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-blue-400">
                        Rescheduled
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {booking.creator_name || booking.full_name}
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {formatShortDate(booking.preferred_date)} at{" "}
                    {formatTime(booking.preferred_time)}
                  </p>

                  {booking.reschedule_reason && (
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--text-secondary)]">
                      Reason: {booking.reschedule_reason}
                    </p>
                  )}
                </div>

                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onApprove(booking)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:opacity-60"
                    title="Approve Booking"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>

                  {onRebook && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onRebook(booking)}
                      className="inline-flex h-9 items-center rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 text-xs font-bold text-blue-400 transition hover:bg-blue-500/20 disabled:opacity-60"
                      title="Rebook"
                    >
                      Rebook
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onReject(booking)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-600 disabled:opacity-60"
                    title="Reject Booking"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>

                  {onArchive && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onArchive(booking)}
                      className="inline-flex h-9 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] disabled:opacity-60"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookingStats({ bookings = [] }) {
  const pending = bookings.filter((booking) => booking.status === "pending").length;
  const approved = bookings.filter((booking) => booking.status === "approved").length;
  const rejected = bookings.filter((booking) => booking.status === "rejected").length;

  const cards = [
    {
      label: "Total Bookings",
      value: bookings.length,
      icon: Calendar,
      tone: "text-[var(--brand-gold)]",
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      tone: "text-[var(--brand-gold)]",
    },
    {
      label: "Approved",
      value: approved,
      icon: CheckCircle2,
      tone: "text-[var(--success)]",
    },
    {
      label: "Rejected",
      value: rejected,
      icon: XCircle,
      tone: "text-[var(--danger)]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.label} className={`${panelClass} p-4`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className={`mt-3 text-2xl font-bold ${card.tone}`}>
                  {card.value}
                </h3>
              </div>

              <div className={iconBoxClass}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BookingDetailRow({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>

      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
        {Icon && <Icon className="h-4 w-4 text-[var(--text-muted)]" />}
        <span>{value || "—"}</span>
      </div>
    </div>
  );
}

export function BookingStatusBadge({ status }) {
  const statusClass =
    CLIENT_BOOKING_STATUS_STYLES[status] ||
    CLIENT_BOOKING_STATUS_STYLES.pending;

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${statusClass}`}
    >
      {labelize(status)}
    </span>
  );
}
