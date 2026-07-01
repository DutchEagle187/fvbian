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
  calendar: string;
  color?: string;
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
  const client = await makeClient(creds);
  const calendars = await client.fetchCalendars();

  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + days);

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
          expandInto(obj.data, name, color, windowStart, windowEnd, out);
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
        objects = await client.fetchCalendarObjects({ calendar: list });
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

/* ---------------------------- iCalendar parsing --------------------------- */

function toCalEvent(
  ev: ICAL.Event,
  start: Date,
  end: Date,
  allDay: boolean,
  calendar: string,
  color: string | undefined,
  id: string
): CalEvent {
  return {
    id,
    title: ev.summary || "(ohne Titel)",
    start: start.toISOString(),
    end: end.toISOString(),
    allDay,
    location: ev.location || undefined,
    calendar,
    color,
  };
}

function expandInto(
  data: string,
  calendar: string,
  color: string | undefined,
  windowStart: Date,
  windowEnd: Date,
  out: CalEvent[]
) {
  const comp = new ICAL.Component(ICAL.parse(data));
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
      while (next && guard < 2000) {
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
                calendar,
                color,
                `${event.uid}-${s.getTime()}`
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
        toCalEvent(
          event,
          s,
          e,
          event.startDate.isDate,
          calendar,
          color,
          event.uid
        )
      );
    }
  }
}
