const { JWT } = require('google-auth-library');

// Helper: format Date object to YYYY-MM-DD in local time (timezone-safe)
function getLocalDateString(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Helper: parse YYYY-MM-DD string into local midnight Date object (timezone-safe)
function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr); // Fallback
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// Helper to adjust Google Calendar date-only end date to inclusive check-out date
function adjustGcalEndDate(isStartDateOnly, isEndDateOnly, endStr) {
    const dateStr = endStr.split('T')[0];
    if (isStartDateOnly && isEndDateOnly) {
        const d = parseLocalDate(dateStr);
        d.setDate(d.getDate() - 1);
        return getLocalDateString(d);
    }
    return dateStr;
}

async function run() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        console.error("Error: GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not defined.");
        process.exit(1);
    }

    try {
        console.log("Parsing Google Service Account credentials...");
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

        console.log("Authenticating with Google OAuth JWT client...");
        const client = new JWT({
            email: serviceAccountKey.client_email,
            key: serviceAccountKey.private_key,
            scopes: ['https://www.googleapis.com/auth/calendar.readonly']
        });

        console.log("Retrieving access token...");
        const tokenInfo = await client.getAccessToken();
        const token = tokenInfo.token;
        if (!token) {
            throw new Error("Failed to retrieve access token from Google.");
        }

        console.log("Fetching Calendar ID from Firebase Realtime Database...");
        const firebaseSettingsUrl = "https://johorn-booking-default-rtdb.asia-southeast1.firebasedatabase.app/settings/gcal.json";
        const settingsRes = await fetch(firebaseSettingsUrl);
        if (!settingsRes.ok) {
            throw new Error(`Failed to fetch GCal settings from Firebase: ${settingsRes.status}`);
        }
        const settings = await settingsRes.json();
        if (!settings || !settings.calendarId) {
            throw new Error("Calendar ID is missing in Firebase settings /settings/gcal.");
        }
        const calendarId = settings.calendarId;
        console.log(`Calendar ID resolved: ${calendarId}`);

        // Set up search date range (3 months ago to 12 months ahead)
        const now = new Date();
        const startOfRange = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const endOfRange = new Date(now.getFullYear(), now.getMonth() + 12, 1);
        
        const timeMin = startOfRange.toISOString();
        const timeMax = endOfRange.toISOString();
        console.log(`Fetching events from GCal for range: ${timeMin.split('T')[0]} ~ ${timeMax.split('T')[0]}`);

        // Fetch events from GCal
        const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
            + `?timeMin=${encodeURIComponent(timeMin)}`
            + `&timeMax=${encodeURIComponent(timeMax)}`
            + `&singleEvents=true`
            + `&maxResults=250`;

        const response = await fetch(gcalUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Google Calendar API returned error status ${response.status}: ${await response.text()}`);
        }
        
        const data = await response.json();
        const events = data.items || [];
        console.log(`Successfully fetched ${events.length} events from Google Calendar.`);

        // Map events to cache format
        const gcalEventsCache = events.map(evt => {
            const start = evt.start.date || evt.start.dateTime;
            const end = evt.end.date || evt.end.dateTime;
            return {
                id: evt.id,
                summary: evt.summary || '예약 완료',
                description: evt.description || '',
                start: start.split('T')[0],
                end: adjustGcalEndDate(!!evt.start.date, !!evt.end.date, end)
            };
        });

        // 1. Check for deletions on Google Calendar to propagate back to Firebase requests
        const activeGcalIds = new Set(events.map(evt => evt.id));
        console.log("Checking for local Firebase reservations deleted on Google Calendar to sync back...");
        const firebaseRequestsUrl = "https://johorn-booking-default-rtdb.asia-southeast1.firebasedatabase.app/requests.json";
        const requestsRes = await fetch(firebaseRequestsUrl);
        if (requestsRes.ok) {
            const requests = await requestsRes.json() || {};
            const keys = Object.keys(requests);
            for (const key of keys) {
                const req = requests[key];
                if (req.type === 'stay' && req.gcalEventId) {
                    const checkinDate = parseLocalDate(req.checkin);
                    // Check if it falls within the searched GCal range [startOfRange, endOfRange]
                    if (checkinDate >= startOfRange && checkinDate <= endOfRange) {
                        if (!activeGcalIds.has(req.gcalEventId)) {
                            console.log(`Propagating deletion: Booking '${req.name}' (${req.checkin} ~ ${req.checkout}) with GCal ID ${req.gcalEventId} is no longer in Google Calendar. Deleting from Firebase...`);
                            const deleteUrl = `https://johorn-booking-default-rtdb.asia-southeast1.firebasedatabase.app/requests/${key}.json`;
                            const delRes = await fetch(deleteUrl, { method: 'DELETE' });
                            if (delRes.ok) {
                                console.log(`Successfully deleted requests/${key} from Firebase.`);
                            } else {
                                console.error(`Failed to delete requests/${key} from Firebase: ${delRes.status}`);
                            }
                        }
                    }
                }
            }
        } else {
            console.error(`Failed to fetch requests from Firebase for deletion propagation: ${requestsRes.status}`);
        }

        // Write to Firebase Realtime Database
        console.log("Writing cached events back to Firebase Realtime Database...");
        const firebaseCacheUrl = "https://johorn-booking-default-rtdb.asia-southeast1.firebasedatabase.app/settings/gcal_events_cache.json";
        const putRes = await fetch(firebaseCacheUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gcalEventsCache)
        });
        if (!putRes.ok) {
            throw new Error(`Firebase Database write failed with status ${putRes.status}: ${await putRes.text()}`);
        }
        
        console.log(`Auto-sync completed successfully. Synced ${gcalEventsCache.length} events.`);
        process.exit(0);
    } catch (err) {
        console.error("GCal Sync Task Failed:", err);
        process.exit(1);
    }
}

run();
