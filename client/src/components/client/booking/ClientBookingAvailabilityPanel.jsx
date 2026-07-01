import { useEffect, useMemo, useState } from "react";

import {
  archiveBookingException,
  createBookingException,
  getBookingExceptions,
  getBookingSettings,
  saveBookingSettings,
} from "../../../services/clientBookings/availability";

import BookingExceptionForm from "./availability/BookingExceptionForm.jsx";
import BookingExceptionList from "./availability/BookingExceptionList.jsx";
import BookingSettingsForm from "./availability/BookingSettingsForm.jsx";

import {
  buildDefaultExceptionForm,
  fromDateTimeLocalValue,
  sortExceptionsByStartDate,
} from "./availability/availabilityPanelUtils";

function buildFullDayRange(dateValue) {
  const date = String(dateValue || "").slice(0, 10);

  if (!date) {
    return {
      starts_at: null,
      ends_at: null,
    };
  }

  return {
    starts_at: new Date(`${date}T00:00:00`).toISOString(),
    ends_at: new Date(`${date}T23:59:59`).toISOString(),
  };
}

function getWeekdayRRuleValue(dateValue) {
  const date = String(dateValue || "").slice(0, 10);
  const weekday = new Date(`${date}T12:00:00`).getDay();

  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][weekday] || null;
}

function buildRecurrenceRule(rule, startsAt, isFullDay) {
  if (!rule) return "";

  if (rule !== "FREQ=WEEKLY" || !isFullDay) {
    return rule;
  }

  const weekday = getWeekdayRRuleValue(startsAt);

  if (!weekday) return rule;

  return `${rule};BYDAY=${weekday}`;
}

export default function ClientBookingAvailabilityPanel({ workspaceId }) {
  const [settings, setSettings] = useState({
    timezone: "Asia/Manila",
    slot_duration_minutes: 60,
  });

  const [exceptions, setExceptions] = useState([]);
  const [exceptionForm, setExceptionForm] = useState(
    buildDefaultExceptionForm()
  );

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingException, setSavingException] = useState(false);
  const [error, setError] = useState("");

  const sortedExceptions = useMemo(() => {
    return sortExceptionsByStartDate(exceptions);
  }, [exceptions]);

  useEffect(() => {
    loadAvailabilityData();
  }, [workspaceId]);

  async function loadAvailabilityData() {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError("");

      const [settingsRow, exceptionRows] = await Promise.all([
        getBookingSettings(workspaceId),
        getBookingExceptions(workspaceId),
      ]);

      setSettings({
        timezone: settingsRow.timezone || "Asia/Manila",
        slot_duration_minutes: settingsRow.slot_duration_minutes || 60,
      });

      setExceptions(exceptionRows || []);
    } catch (err) {
      console.error("Booking availability load error:", err);
      setError(err.message || "Failed to load availability settings.");
    } finally {
      setLoading(false);
    }
  }

  function updateSettings(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateExceptionForm(key, value) {
    setExceptionForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function buildExceptionPayload() {
    const isFullDay = Boolean(exceptionForm.is_full_day);
    const fullDayRange = isFullDay
      ? buildFullDayRange(exceptionForm.starts_at)
      : null;

    const startsAt = isFullDay
      ? fullDayRange.starts_at
      : fromDateTimeLocalValue(exceptionForm.starts_at);

    const endsAt = isFullDay
      ? fullDayRange.ends_at
      : fromDateTimeLocalValue(exceptionForm.ends_at);

    return {
      ...exceptionForm,
      starts_at: startsAt,
      ends_at: endsAt,
      recurrence_rule: buildRecurrenceRule(
        exceptionForm.recurrence_rule,
        exceptionForm.starts_at,
        isFullDay
      ),
    };
  }

  async function handleSaveSettings(event) {
    event.preventDefault();

    try {
      setSavingSettings(true);

      const saved = await saveBookingSettings(workspaceId, settings);

      setSettings({
        timezone: saved.timezone || "Asia/Manila",
        slot_duration_minutes: saved.slot_duration_minutes || 60,
      });
    } catch (err) {
      console.error("Booking settings save error:", err);
      alert(err.message || "Failed to save booking settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCreateException(event) {
    event.preventDefault();

    try {
      setSavingException(true);

      await createBookingException(workspaceId, buildExceptionPayload());

      setExceptionForm(buildDefaultExceptionForm());
      await loadAvailabilityData();
    } catch (err) {
      console.error("Booking exception create error:", err);
      alert(err.message || "Failed to create unavailable date.");
    } finally {
      setSavingException(false);
    }
  }

  async function handleArchiveException(exception) {
    const confirmed = window.confirm(
      `Remove "${exception.title}" from blocked availability?`
    );

    if (!confirmed) return;

    try {
      await archiveBookingException(exception.id);
      await loadAvailabilityData();
    } catch (err) {
      console.error("Booking exception archive error:", err);
      alert(err.message || "Failed to remove unavailable date.");
    }
  }

  if (!workspaceId) {
    return (
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
        <p className="text-sm text-[var(--text-secondary)]">
          Workspace is still loading.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="space-y-6">
        <BookingSettingsForm
          settings={settings}
          saving={savingSettings}
          onChange={updateSettings}
          onSubmit={handleSaveSettings}
        />

        <BookingExceptionForm
          form={exceptionForm}
          saving={savingException}
          onChange={updateExceptionForm}
          onSubmit={handleCreateException}
        />
      </section>

      <BookingExceptionList
        loading={loading}
        error={error}
        exceptions={sortedExceptions}
        onRefresh={loadAvailabilityData}
        onArchive={handleArchiveException}
      />
    </div>
  );
}
