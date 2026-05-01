const SQLITE_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
const ISO_TIMESTAMP_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

type TimestampedRow = {
  completed_at: string;
};

export function utcNowIso(): string {
  return new Date().toISOString();
}

export function toClientTimestamp(value: string): string {
  if (SQLITE_UTC_TIMESTAMP.test(value)) {
    return `${value.replace(' ', 'T')}Z`;
  }

  if (ISO_TIMESTAMP_WITHOUT_ZONE.test(value)) {
    return `${value}Z`;
  }

  return value;
}

export function serializeSession<T extends TimestampedRow>(session: T): T {
  return {
    ...session,
    completed_at: toClientTimestamp(session.completed_at),
  };
}

export function serializeSessions<T extends TimestampedRow>(sessions: T[]): T[] {
  return sessions.map(serializeSession);
}
