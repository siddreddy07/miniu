// Reads a day from a message like "yesterday", "on Monday", "3 days ago", "last week" or "Nov 10".
// It works in the user's timezone, so "yesterday" means yesterday where the user lives.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Finds a weekday name in the text. Short names like "tue" work too.
function findWeekday(lower) {
  const names = [
    'sunday', 'monday|mon', 'tuesday|tues|tue', 'wednesday|wed',
    'thursday|thurs|thur|thu', 'friday|fri', 'saturday',
  ];
  for (let i = 0; i < names.length; i++) {
    if (new RegExp('\\b(' + names[i] + ')\\b').test(lower)) return i;
  }
  return -1;
}

// How many milliseconds the timezone is ahead of UTC at this moment
function getOffset(ms, timezone) {
  const seconds = Math.floor(ms / 1000) * 1000;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(seconds));

  const p = {};
  for (const part of parts) p[part.type] = Number(part.value);
  const localAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return localAsUtc - seconds;
}

// The moment (in ms) when this calendar day starts in the timezone
function startOfDay(year, month, day, timezone) {
  const guess = Date.UTC(year, month - 1, day);
  let start = guess - getOffset(guess, timezone);
  // Check again, because daylight saving can move the offset
  start = guess - getOffset(start, timezone);
  return start;
}

// Moves a calendar day forward or back by some days
function addDays(year, month, day, days) {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

// Today's calendar day in the timezone
function getToday(timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());

  const p = {};
  for (const part of parts) p[part.type] = Number(part.value);
  return { year: p.year, month: p.month, day: p.day };
}

// Makes the answer: from the start of the first day to the start of the day after the last day
function makeRange(first, daysLong, timezone, label) {
  const last = addDays(first.year, first.month, first.day, daysLong);
  return {
    start: new Date(startOfDay(first.year, first.month, first.day, timezone)).toISOString(),
    end: new Date(startOfDay(last.year, last.month, last.day, timezone)).toISOString(),
    label: label,
  };
}

// Returns { start, end, label } as ISO times, or null if the text has no day in it
export function getDateRange(text, timezone) {
  // If the timezone is missing or wrong, use the server's timezone
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  const lower = text.toLowerCase();
  const today = getToday(timezone);
  const todayWeekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();

  // "day before yesterday" must be checked before "yesterday"
  if (lower.includes('day before yesterday')) {
    return makeRange(addDays(today.year, today.month, today.day, -2), 1, timezone, 'the day before yesterday');
  }
  if (lower.includes('yesterday')) {
    return makeRange(addDays(today.year, today.month, today.day, -1), 1, timezone, 'yesterday');
  }

  // "3 days ago"
  const daysAgo = lower.match(/(\d+)\s+days?\s+ago/);
  if (daysAgo) {
    const first = addDays(today.year, today.month, today.day, -Number(daysAgo[1]));
    return makeRange(first, 1, timezone, daysAgo[1] + ' days ago');
  }

  // "Tue", "tuesday"... (index 0 = Sunday), or -1 if there is no weekday in the text
  const weekday = findWeekday(lower);

  if (lower.includes('last week')) {
    const sinceMonday = (todayWeekday + 6) % 7;
    const lastMonday = addDays(today.year, today.month, today.day, -sinceMonday - 7);
    // "last week Tue" is one day of that week, plain "last week" is the whole week
    if (weekday >= 0) {
      const first = addDays(lastMonday.year, lastMonday.month, lastMonday.day, (weekday + 6) % 7);
      return makeRange(first, 1, timezone, 'last week ' + WEEKDAYS[weekday]);
    }
    return makeRange(lastMonday, 7, timezone, 'last week');
  }

  // "Monday": the most recent Monday before today
  if (weekday >= 0) {
    const daysBack = (todayWeekday - weekday + 7) % 7 || 7;
    const first = addDays(today.year, today.month, today.day, -daysBack);
    return makeRange(first, 1, timezone, WEEKDAYS[weekday]);
  }

  // "November 10th" or "Nov 10", and also "10th November" or "10 nov"
  const monthNames = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
  const monthFirst = lower.match(new RegExp('\\b(' + monthNames + ')[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b'));
  const dayFirst = lower.match(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(' + monthNames + ')[a-z]*\\b'));
  if (monthFirst || dayFirst) {
    const monthText = monthFirst ? monthFirst[1] : dayFirst[2];
    const month = MONTHS.indexOf(monthText) + 1;
    const day = Number(monthFirst ? monthFirst[2] : dayFirst[1]);
    // If that day is still ahead this year, we mean last year
    let year = today.year;
    if (month > today.month || (month === today.month && day > today.day)) year = year - 1;
    return makeRange({ year: year, month: month, day: day }, 1, timezone, monthText + ' ' + day);
  }

  // "today" is checked last, so "what did I ask on 3 November, is it right today?" means 3 November
  if (/\btoday\b/.test(lower)) {
    return makeRange(today, 1, timezone, 'today');
  }

  return null;
}
