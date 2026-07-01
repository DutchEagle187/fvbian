import { createDAVClient } from "tsdav";
import ICAL from "ical.js";

import { getRedis } from "@/lib/redis";
import { decrypt, encrypt } from "@/lib/crypto";

const SERVER_URL = "https://caldav.icloud.com";

export interface CalendarCreds {
  username: string;
  password: string;
}

export interface CalEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
  location?: string;
  notes?: string;
  calendar: string;
  color?: string;
  uid: string;
  url: string;
  etag?: string;
  calendarUrl: string;
  recurring: boolean;
}

export interface CalendarCollection {
  name: string;
  url: string;
  color?: string;
  kind: "event" | "reminder";
}

export interface EventInput {
  title: string;
  allDay: boolean;
  start: string; // datetime-local ("YYYY-MM-DDTHH:mm") or date ("YYYY-MM-DD")
  end: string;
  location?: string;
  notes?: string;
}

export interface ReminderInput {
  title: string;
  notes?: string;
  due?: string | null; // datetime-local or null
  priority?: number;
}

export interface Reminder {
  id: string;
  url: string;
  calendarUrl: string;
  title: string;
  notes?: string;
  due?: string | null; // ISO
  completed: boolean;
  priority?: number;
  list: string;
  listColor?: string;
}

const redisKey = (email: string) => `u:${email.toLowerCase()}:calendar`;

/* --------------------------- credential storage --------------------------- */

export async function getCreds(email: string): Promise<CalendarCreds | null> {
  const redis = getRedis();
  if (!redis) return null;
  const stored = await redis.get<{ username: string; password: string }>(
    redisKey(email)
  );
  if (!stored?.username || !stored.password) return null;
  try {
    return { username: stored.username, password: decrypt(stored.password) };
  } catch {
    return null;
  }
}

export async function saveCreds(
  email: string,
  creds: CalendarCreds
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  await redis.set(redisKey(email), {
    username: creds.username,
    password: encrypt(creds.password),
  });
  return true;
}

export async function deleteCreds(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(redisKey(email));
}

/* ------------------------------- CalDAV I/O ------------------------------- */

async function makeClient(creds: CalendarCreds) {
  return createDAVClient({
    serverUrl: SERVER_URL,
    credentials: { username: creds.username, password: creds.password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

export async function testConnection(
  creds: CalendarCreds
): Promise<{ ok: boolean; calendars?: number; error?: string }> {
  try {
    const client = await makeClient(creds);
    const calendars = await client.fetchCalendars();
    return { ok: true, calendars: calendars.length };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Verbindung fehlgeschlagen" };
  }
}

export async function fetchUpcomingEvents(
  creds: CalendarCreds,
  days = 14
): Promise<CalEvent[]> {
  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + days);
  return fetchEvents(creds, windowStart, windowEnd);
}

export async function fetchEvents(
  creds: CalendarCreds,
  windowStart: Date,
  windowEnd: Date
): Promise<CalEvent[]> {
  const client = await makeClient(creds);
  const calendars = await client.fetchCalendars();

  const eventCalendars = calendars.filter(
    (c) => !c.components?.length || c.components.includes("VEVENT")
  );

  const out: CalEvent[] = [];

  await Promise.all(
    eventCalendars.map(async (cal) => {
      const name =
        typeof cal.displayName === "string" ? cal.displayName : "Kalender";
      const color =
        typeof cal.calendarColor === "string" ? cal.calendarColor : undefined;
      let objects;
      try {
        objects = await client.fetchCalendarObjects({
          calendar: cal,
          timeRange: {
            start: windowStart.toISOString(),
            end: windowEnd.toISOString(),
          },
        });
      } catch {
        return;
      }
      for (const obj of objects) {
        if (!obj.data) continue;
        try {
          expandInto(
            obj.data,
            {
              calendar: name,
              color,
              url: obj.url,
              etag: obj.etag,
              calendarUrl: cal.url,
            },
            windowStart,
            windowEnd,
            out
          );
        } catch {
          // skip unparseable objects
        }
      }
    })
  );

  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

/* ------------------------------- reminders -------------------------------- */

export async function fetchReminders(creds: CalendarCreds): Promise<Reminder[]> {
  const client = await makeClient(creds);
  const calendars = await client.fetchCalendars();

  // Reminder lists are CalDAV collections that support VTODO.
  const todoLists = calendars.filter((c) => c.components?.includes("VTODO"));

  const out: Reminder[] = [];

  await Promise.all(
    todoLists.map(async (list) => {
      const name =
        typeof list.displayName === "string" ? list.displayName : "Liste";
      const color =
        typeof list.calendarColor === "string" ? list.calendarColor : undefined;
      let objects;
      try {
        objects = await client.fetchCalendarObjects({
          calendar: list,
          // tsdav's default filter targets VEVENT; reminders are VTODO, so we
          // must ask for VTODO explicitly or nothing comes back.
          filters: [
            {
              "comp-filter": {
                _attributes: { name: "VCALENDAR" },
                "comp-filter": { _attributes: { name: "VTODO" } },
              },
            },
          ] as Parameters<
            typeof client.fetchCalendarObjects
          >[0]["filters"],
        });
      } catch {
        return;
      }
      for (const obj of objects) {
        if (!obj.data) continue;
        try {
          const comp = new ICAL.Component(ICAL.parse(obj.data));
          for (const vtodo of comp.getAllSubcomponents("vtodo")) {
            const status = vtodo.getFirstPropertyValue("status");
            const percent = vtodo.getFirstPropertyValue("percent-complete");
            const completed =
              status === "COMPLETED" ||
              vtodo.hasProperty("completed") ||
              Number(percent) === 100;

            const dueProp = vtodo.getFirstProperty("due");
            let due: string | null = null;
            if (dueProp) {
              const val = dueProp.getFirstValue();
              if (val instanceof ICAL.Time) due = val.toJSDate().toISOString();
            }

            const title = vtodo.getFirstPropertyValue("summary");
            const notes = vtodo.getFirstPropertyValue("description");
            const priority = vtodo.getFirstPropertyValue("priority");
            const uid = vtodo.getFirstPropertyValue("uid");

            out.push({
              id: typeof uid === "string" ? uid : obj.url,
              url: obj.url,
              calendarUrl: list.url,
              title: typeof title === "string" ? title : "(ohne Titel)",
              notes: typeof notes === "string" ? notes : undefined,
              due,
              completed,
              priority: typeof priority === "number" ? priority : undefined,
              list: name,
              listColor: color,
            });
          }
        } catch {
          // skip unparseable todo
        }
      }
    })
  );

  return out;
}

export async function toggleReminder(
  creds: CalendarCreds,
  target: { url: string; calendarUrl: string },
  done: boolean
): Promise<void> {
  const client = await makeClient(creds);

  // Re-fetch the object to get fresh data + etag (avoids stale-etag conflicts).
  const objects = await client.fetchCalendarObjects({
    calendar: { url: target.calendarUrl } as Parameters<
      typeof client.fetchCalendarObjects
    >[0]["calendar"],
    objectUrls: [target.url],
  });
  const obj = objects[0];
  if (!obj?.data) throw new Error("Erinnerung nicht gefunden.");

  const comp = new ICAL.Component(ICAL.parse(obj.data));
  const vtodo = comp.getFirstSubcomponent("vtodo");
  if (!vtodo) throw new Error("Kein VTODO im Objekt.");

  if (done) {
    vtodo.updatePropertyWithValue("status", "COMPLETED");
    vtodo.updatePropertyWithValue("percent-complete", 100);
    vtodo.updatePropertyWithValue(
      "completed",
      ICAL.Time.fromJSDate(new Date(), true)
    );
  } else {
    vtodo.updatePropertyWithValue("status", "NEEDS-ACTION");
    vtodo.removeAllProperties("completed");
    vtodo.removeAllProperties("percent-complete");
  }

  await client.updateCalendarObject({
    calendarObject: { url: obj.url, data: comp.toString(), etag: obj.etag },
  });
}

/* ------------------------------ writing (CRUD) ---------------------------- */

export async function listCollections(
  creds: CalendarCreds
): Promise<CalendarCollection[]> {
  const client = await makeClient(creds);
  const calendars = await client.fetchCalendars();
  const out: CalendarCollection[] = [];
  for (const c of calendars) {
    const name = typeof c.displayName === "string" ? c.displayName : "Kalender";
    const color =
      typeof c.calendarColor === "string" ? c.calendarColor : undefined;
    const comps = c.components ?? [];
    if (comps.length === 0 || comps.includes("VEVENT")) {
      out.push({ name, url: c.url, color, kind: "event" });
    }
    if (comps.includes("VTODO")) {
      out.push({ name, url: c.url, color, kind: "reminder" });
    }
  }
  return out;
}

function uuid(): string {
  return `fvbian-${globalThis.crypto.randomUUID()}`;
}

function allDayTime(dateStr: string, addDays = 0): ICAL.Time {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + addDays);
  return ICAL.Time.fromData({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    isDate: true,
  });
}

function utcTime(dateTimeStr: string): ICAL.Time {
  return ICAL.Time.fromJSDate(new Date(dateTimeStr), true);
}

function applyEventProps(vevent: ICAL.Component, input: EventInput) {
  vevent.removeAllProperties("summary");
  vevent.updatePropertyWithValue("summary", input.title);

  vevent.removeAllProperties("dtstart");
  vevent.removeAllProperties("dtend");
  if (input.allDay) {
    vevent.updatePropertyWithValue("dtstart", allDayTime(input.start));
    // DTEND is exclusive for all-day events (end date + 1 day).
    const endBase = input.end || input.start;
    vevent.updatePropertyWithValue("dtend", allDayTime(endBase, 1));
  } else {
    vevent.updatePropertyWithValue("dtstart", utcTime(input.start));
    vevent.updatePropertyWithValue("dtend", utcTime(input.end || input.start));
  }

  vevent.removeAllProperties("location");
  if (input.location?.trim()) {
    vevent.updatePropertyWithValue("location", input.location.trim());
  }
  vevent.removeAllProperties("description");
  if (input.notes?.trim()) {
    vevent.updatePropertyWithValue("description", input.notes.trim());
  }
}

export async function createEvent(
  creds: CalendarCreds,
  calendarUrl: string,
  input: EventInput
): Promise<void> {
  const client = await makeClient(creds);
  const uid = uuid();

  const cal = new ICAL.Component("vcalendar");
  cal.updatePropertyWithValue("prodid", "-//fvbian//DE");
  cal.updatePropertyWithValue("version", "2.0");
  const vevent = new ICAL.Component("vevent");
  vevent.updatePropertyWithValue("uid", uid);
  vevent.updatePropertyWithValue(
    "dtstamp",
    ICAL.Time.fromJSDate(new Date(), true)
  );
  applyEventProps(vevent, input);
  cal.addSubcomponent(vevent);

  await client.createCalendarObject({
    calendar: { url: calendarUrl } as Parameters<
      typeof client.createCalendarObject
    >[0]["calendar"],
    iCalString: cal.toString(),
    filename: `${uid}.ics`,
  });
}

export async function updateEvent(
  creds: CalendarCreds,
  target: { url: string; calendarUrl: string },
  input: EventInput
): Promise<void> {
  const client = await makeClient(creds);
  const objects = await client.fetchCalendarObjects({
    calendar: { url: target.calendarUrl } as Parameters<
      typeof client.fetchCalendarObjects
    >[0]["calendar"],
    objectUrls: [target.url],
  });
  const obj = objects[0];
  if (!obj?.data) throw new Error("Termin nicht gefunden.");

  const comp = new ICAL.Component(ICAL.parse(obj.data));
  const vevent = comp.getFirstSubcomponent("vevent");
  if (!vevent) throw new Error("Kein VEVENT im Objekt.");
  applyEventProps(vevent, input);

  await client.updateCalendarObject({
    calendarObject: { url: obj.url, data: comp.toString(), etag: obj.etag },
  });
}

export async function deleteObject(
  creds: CalendarCreds,
  target: { url: string; calendarUrl: string }
): Promise<void> {
  const client = await makeClient(creds);
  const objects = await client.fetchCalendarObjects({
    calendar: { url: target.calendarUrl } as Parameters<
      typeof client.fetchCalendarObjects
    >[0]["calendar"],
    objectUrls: [target.url],
  });
  const obj = objects[0];
  if (!obj) throw new Error("Objekt nicht gefunden.");
  await client.deleteCalendarObject({
    calendarObject: { url: obj.url, etag: obj.etag, data: obj.data },
  });
}

function applyReminderProps(vtodo: ICAL.Component, input: ReminderInput) {
  vtodo.removeAllProperties("summary");
  vtodo.updatePropertyWithValue("summary", input.title);

  vtodo.removeAllProperties("description");
  if (input.notes?.trim()) {
    vtodo.updatePropertyWithValue("description", input.notes.trim());
  }

  vtodo.removeAllProperties("due");
  if (input.due) {
    vtodo.updatePropertyWithValue("due", utcTime(input.due));
  }

  vtodo.removeAllProperties("priority");
  if (typeof input.priority === "number" && input.priority > 0) {
    vtodo.updatePropertyWithValue("priority", input.priority);
  }
}

export async function createReminder(
  creds: CalendarCreds,
  calendarUrl: string,
  input: ReminderInput
): Promise<void> {
  const client = await makeClient(creds);
  const uid = uuid();

  const cal = new ICAL.Component("vcalendar");
  cal.updatePropertyWithValue("prodid", "-//fvbian//DE");
  cal.updatePropertyWithValue("version", "2.0");
  const vtodo = new ICAL.Component("vtodo");
  vtodo.updatePropertyWithValue("uid", uid);
  vtodo.updatePropertyWithValue(
    "dtstamp",
    ICAL.Time.fromJSDate(new Date(), true)
  );
  vtodo.updatePropertyWithValue("status", "NEEDS-ACTION");
  applyReminderProps(vtodo, input);
  cal.addSubcomponent(vtodo);

  await client.createCalendarObject({
    calendar: { url: calendarUrl } as Parameters<
      typeof client.createCalendarObject
    >[0]["calendar"],
    iCalString: cal.toString(),
    filename: `${uid}.ics`,
  });
}

export async function updateReminder(
  creds: CalendarCreds,
  target: { url: string; calendarUrl: string },
  input: ReminderInput
): Promise<void> {
  const client = await makeClient(creds);
  const objects = await client.fetchCalendarObjects({
    calendar: { url: target.calendarUrl } as Parameters<
      typeof client.fetchCalendarObjects
    >[0]["calendar"],
    objectUrls: [target.url],
  });
  const obj = objects[0];
  if (!obj?.data) throw new Error("Erinnerung nicht gefunden.");

  const comp = new ICAL.Component(ICAL.parse(obj.data));
  const vtodo = comp.getFirstSubcomponent("vtodo");
  if (!vtodo) throw new Error("Kein VTODO im Objekt.");
  applyReminderProps(vtodo, input);

  await client.updateCalendarObject({
    calendarObject: { url: obj.url, data: comp.toString(), etag: obj.etag },
  });
}

/* ---------------------------- iCalendar parsing --------------------------- */

interface ObjMeta {
  calendar: string;
  color: string | undefined;
  url: string;
  etag?: string;
  calendarUrl: string;
}

function toCalEvent(
  ev: ICAL.Event,
  start: Date,
  end: Date,
  allDay: boolean,
  meta: ObjMeta,
  id: string,
  recurring: boolean
): CalEvent {
  return {
    id,
    title: ev.summary || "(ohne Titel)",
    start: start.toISOString(),
    end: end.toISOString(),
    allDay,
    location: ev.location || undefined,
    notes: ev.description || undefined,
    calendar: meta.calendar,
    color: meta.color,
    uid: ev.uid,
    url: meta.url,
    etag: meta.etag,
    calendarUrl: meta.calendarUrl,
    recurring,
  };
}

function expandInto(
  data: string,
  meta: ObjMeta,
  windowStart: Date,
  windowEnd: Date,
  out: CalEvent[]
) {
  const comp = new ICAL.Component(ICAL.parse(data));

  // Register any embedded VTIMEZONE so TZID references resolve correctly.
  for (const vtz of comp.getAllSubcomponents("vtimezone")) {
    try {
      const tzid = vtz.getFirstPropertyValue("tzid");
      if (typeof tzid === "string" && !ICAL.TimezoneService.has(tzid)) {
        ICAL.TimezoneService.register(vtz);
      }
    } catch {
      // ignore malformed timezone
    }
  }

  const vevents = comp.getAllSubcomponents("vevent");
  if (vevents.length === 0) return;

  const masters = vevents.filter((v) => !v.hasProperty("recurrence-id"));
  const exceptions = vevents.filter((v) => v.hasProperty("recurrence-id"));
  const roots = masters.length > 0 ? masters : vevents;

  for (const root of roots) {
    const event = new ICAL.Event(root);

    for (const ex of exceptions) {
      try {
        const exEvent = new ICAL.Event(ex);
        if (exEvent.uid === event.uid) event.relateException(ex);
      } catch {
        // ignore malformed exception
      }
    }

    if (event.isRecurring()) {
      const iterator = event.iterator();
      let next = iterator.next();
      let guard = 0;
      while (next && guard < 20000) {
        guard++;
        if (next.toJSDate() > windowEnd) break;
        try {
          const det = event.getOccurrenceDetails(next);
          const s = det.startDate.toJSDate();
          const e = det.endDate.toJSDate();
          if (e >= windowStart) {
            out.push(
              toCalEvent(
                det.item,
                s,
                e,
                det.startDate.isDate,
                meta,
                `${event.uid}-${s.getTime()}`,
                true
              )
            );
          }
        } catch {
          // skip bad occurrence
        }
        next = iterator.next();
      }
    } else {
      const s = event.startDate?.toJSDate();
      const e = event.endDate?.toJSDate();
      if (!s || !e) continue;
      if (e < windowStart || s > windowEnd) continue;
      out.push(
        toCalEvent(event, s, e, event.startDate.isDate, meta, event.uid, false)
      );
    }
  }
}
