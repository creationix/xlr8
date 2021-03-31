export interface AppendStorage {
  /** Add data to the storage pool, returns offset of written data */
  append(data: Uint8Array): Promise<number>;
  /** Read an entry using offset to entry. */
  read(offset: number): Promise<Uint8Array>;
  /** Offset to last entry */
  getLastOffset(): number;
}

interface MemoryAppendStorage extends AppendStorage {
  pieces: Uint8Array[];
}

export function memoryStorage(): MemoryAppendStorage {
  const pieces: Uint8Array[] = [];
  return {
    append(data) {
      const offset = pieces.length;
      pieces.push(data.slice(0));
      return Promise.resolve(offset);
    },
    read(offset) {
      console.log("READ", offset);
      return Promise.resolve(pieces[offset].slice(0));
    },
    getLastOffset() {
      return pieces.length - 1;
    },
    pieces,
  };
}
