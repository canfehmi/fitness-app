/**
 * Remote hero images for the timer screen (HTTPS).
 * Replace with Supabase Storage URLs or exercises.image_url when you add a column.
 */
const DEFAULT_POOL = [
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1599058945522-237b82418c0d?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80&auto=format&fit=crop",
];

const OVERRIDES: { test: RegExp; uri: string }[] = [
  {
    test: /squat|çömel|squat|leg|bacak|lunge|adım/i,
    uri: "https://images.unsplash.com/photo-1434608519344-49d77b8e8069?w=900&q=80&auto=format&fit=crop",
  },
  {
    test: /push|şın|dip|press|chest|göğüs|triceps|kol/i,
    uri: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=900&q=80&auto=format&fit=crop",
  },
  {
    test: /plank|köprü|core|karın|abs|mekik|crunch/i,
    uri: "https://images.unsplash.com/photo-1566241142559-f40b1580a676?w=900&q=80&auto=format&fit=crop",
  },
  {
    test: /burpee|jump|zıpla|atlama|cardio|koş|run|hiit/i,
    uri: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=900&q=80&auto=format&fit=crop",
  },
  {
    test: /stretch|esne|yoga|warm|ısın|dinlen|cool/i,
    uri: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80&auto=format&fit=crop",
  },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Stable image per exercise name; prefers keyword matches (TR/EN). */
export function getExerciseImageUri(exerciseName: string): string {
  const n = exerciseName.trim();
  if (!n) return DEFAULT_POOL[0];
  for (const o of OVERRIDES) {
    if (o.test.test(n)) return o.uri;
  }
  return DEFAULT_POOL[hashString(n) % DEFAULT_POOL.length];
}
