/**
 * Normalisers for a project's `detail` jsonb column. Shared between the
 * public renderer (src/components/case-study.tsx) and the admin features
 * editor (src/app/admin/(protected)/projects/project-form.tsx) so both agree
 * on what a "feature" is, regardless of which of the shapes seen in the DB
 * so far a given row happens to use — Easy Club's `{id,name,summary,points}`,
 * an AI draft or admin-authored `{name,description}`, etc.
 */

export type NormalizedFeature = { id: string; name: string; summary: string; points: string[] };
export type NormalizedModule = { id: string; name: string; line: string; detail: string };
export type NormalizedProvider = { label: string; detail?: string };
export type NormalizedEngineeringLine = { label?: string; text: string };

export function normalizeFeatures(input: unknown): NormalizedFeature[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw, i): NormalizedFeature => {
      const p = (raw ?? {}) as Record<string, unknown>;
      const name = String(p.name ?? p.title ?? '');
      const points = Array.isArray(p.points)
        ? p.points.map(String)
        : Array.isArray(p.bullets)
          ? p.bullets.map(String)
          : [];
      return {
        id: String(p.id ?? name ?? i),
        name,
        summary: String(p.summary ?? p.description ?? p.detail ?? ''),
        points,
      };
    })
    .filter((p) => p.name);
}

export function normalizeModules(input: unknown): NormalizedModule[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw, i): NormalizedModule => {
      const m = (raw ?? {}) as Record<string, unknown>;
      const name = String(m.name ?? m.title ?? '');
      return {
        id: String(m.id ?? name ?? i),
        name,
        line: String(m.line ?? m.role ?? m.summary ?? ''),
        detail: String(m.detail ?? m.description ?? ''),
      };
    })
    .filter((m) => m.name);
}

export function normalizeProviders(input: unknown): NormalizedProvider[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw): NormalizedProvider => {
      if (typeof raw === 'string') return { label: raw };
      const p = (raw ?? {}) as Record<string, unknown>;
      const category = p.category ? String(p.category) : undefined;
      const technology = p.technology ?? p.name;
      const label = technology ? String(technology) : (category ?? '');
      const detail = [category, p.purpose].filter(Boolean).join(' — ');
      return { label, detail: detail || undefined };
    })
    .filter((p) => p.label);
}

export function normalizeEngineering(input: unknown): NormalizedEngineeringLine[] {
  if (Array.isArray(input)) return input.map((line) => ({ text: String(line) }));
  if (input && typeof input === 'object') {
    return Object.entries(input as Record<string, unknown>).map(([key, value]) => ({
      label: key.replace(/_/g, ' '),
      text: String(value),
    }));
  }
  return [];
}
