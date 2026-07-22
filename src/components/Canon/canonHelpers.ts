// canonHelpers — non-component helpers for the /canon render primitives.
// Kept out of CanonPrimitives.tsx so that file only exports components
// (react-refresh fast-refresh hygiene).

import type { JsonValue } from '../../data/canonTypes';

/** True if a value is "honestly empty" (null / '' / [] / {}). */
export function isEmptyValue(v: JsonValue | undefined): boolean {
  return (
    v == null ||
    v === '' ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
  );
}
