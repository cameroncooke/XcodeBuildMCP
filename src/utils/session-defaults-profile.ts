export function normalizeSessionDefaultsProfileName(profile?: string | null): string | null {
  if (profile == null) {
    return null;
  }

  const trimmed = profile.trim();
  if (trimmed.length === 0) {
    throw new Error('Profile name cannot be empty.');
  }

  return trimmed;
}
