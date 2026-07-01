import { parseBookingDateTime } from "./utils";

export function getBookingCollections(
  bookings = [],
  selectedDate
) {
  const now = new Date();

  const next24h = new Date(
    now.getTime() + 24 * 60 * 60 * 1000
  );

  const approvedBookings = bookings.filter(
    (booking) => {
      if (booking.status !== "approved") {
        return false;
      }

      const bookingDateTime = parseBookingDateTime(
        booking.preferred_date,
        booking.preferred_time
      );

      return (
        bookingDateTime &&
        bookingDateTime >= now &&
        bookingDateTime <= next24h
      );
    }
  );

  const pendingBookings = bookings.filter(
    (booking) =>
      [
        "pending",
        "new",
        "rescheduled",
        "reschedule_requested",
        null,
        undefined,
        "",
      ].includes(booking.status)
  );

  const selectedDateBookings = bookings.filter(
    (booking) =>
      booking.preferred_date === selectedDate
  );

  const bookedDates = new Set(
    bookings
      .map((booking) => booking.preferred_date)
      .filter(Boolean)
  );

  return {
    approvedBookings,
    pendingBookings,
    selectedDateBookings,
    bookedDates,
  };
}
