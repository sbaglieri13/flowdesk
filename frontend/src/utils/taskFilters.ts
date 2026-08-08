/**
 * Sentinels used by the priority/tag task filters. The filter UI always
 * stores the *exact* explicit selection (never an implicit "empty means
 * everything") — the default state is seeded with every real id checked, so
 * "select all" reads unambiguously as checked and "deselect all" as
 * genuinely empty, with no state meaning two different things.
 */

/** "Untagged" pseudo-tag, shown as a real selectable option in the tag
 * filter. Matches task_service.NO_TAG_FILTER_ID on the backend — never a
 * real tag id (autoincrement starts at 1). */
export const NO_TAG_FILTER_ID = -1

/**
 * An HTTP request that omits a filter param is indistinguishable from one
 * that was never filtered at all, so "the user explicitly deselected every
 * priority/tag" can't be expressed by sending nothing — these are sent
 * instead to force zero matches. Never real ids, and distinct from each
 * other and from NO_TAG_FILTER_ID (which is a meaningful tag filter, not an
 * empty one).
 */
export const IMPOSSIBLE_PRIORITY_ID = -1
export const IMPOSSIBLE_TAG_ID = -2
