export interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const { maxChunkSize = 500, overlap = 50 } = options;

  if (!text || text.trim().length === 0) return [];
  if (maxChunkSize <= 0) return [];
  if (overlap >= maxChunkSize) {
    throw new Error("Overlap måste vara mindre än maxChunkSize");
  }

  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];

  let currentWords: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    const spaceNeeded = currentWords.length > 0 ? 1 : 0;
    const addedLength = word.length + spaceNeeded;

    if (currentLength + addedLength > maxChunkSize && currentWords.length > 0) {
      chunks.push(currentWords.join(" "));

      // Bygg överlappning från slutet av nuvarande words
      const overlapWords: string[] = [];
      let overlapLength = 0;

      if (overlap > 0) {
        for (let i = currentWords.length - 1; i >= 0; i--) {
          const w = currentWords[i];
          const wSpace = overlapWords.length > 0 ? 1 : 0;
          if (overlapLength + w.length + wSpace <= overlap) {
            overlapWords.unshift(w);
            overlapLength += w.length + wSpace;
          } else {
            break;
          }
        }
      }

      currentWords = [...overlapWords, word];
      currentLength = currentWords.join(" ").length;
    } else {
      currentWords.push(word);
      currentLength += addedLength;
    }
  }

  if (currentWords.length > 0) {
    chunks.push(currentWords.join(" "));
  }

  return chunks;
}
