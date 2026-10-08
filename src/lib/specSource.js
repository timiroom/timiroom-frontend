// Hash the exact loaded original, preserving whitespace and UTF-8 Korean/emoji bytes.
export async function sourceMatchesSnapshot(project, type, document) {
  const source = project?.artifactSources?.[type];
  if (!source || !document || String(source.artifactId) !== String(document.artifactId)
      || source.version !== document.version || typeof source.content !== "string") return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source.content));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hash === document.hash;
}
