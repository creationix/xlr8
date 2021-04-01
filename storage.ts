export interface BlockStorage {
  get(index: number): Promise<Uint8Array>;
  put(index: number, block: Uint8Array, offset?: number): Promise<void>;
  blockSize: number;
}

export function memoryBlockStorage(blockSize: number): BlockStorage {
  const blocks: Uint8Array[] = [];
  return { get, put, blockSize };
  async function get(index: number) {
    // Simulate I/O using promises.
    let block = await Promise.resolve(blocks[index]);
    if (!block) {
      block = await Promise.resolve(blocks[index] = new Uint8Array(blockSize));
    }
    return block;
  }
  async function put(index: number, data: Uint8Array, offset = 0) {
    (await get(index)).set(data, offset);
  }
}

export interface AppendStorage {
  /** Add data to the storage pool, returns offset of written data */
  append(data: Uint8Array): Promise<number>;
  appendObj(data: any): Promise<number>;
  /** Read an entry using offset to entry. */
  read(offset: number): Promise<Uint8Array>;
  readObj(offset: number): Promise<any>;
  /** Offset to last entry */
  getLastOffset(): number;
}

export function appendStorage(storage: Storage): AppendStorage {
  const lenBuf = new Uint8Array(2);
  return { append, appendObj, read, readObj, getLastOffset };

  function append(data: Uint8Array) {
    const offset = storage.getSize();
    lenBuf[0] = data.byteLength >> 8;
    lenBuf[1] = data.byteLength & 0xff;
    storage.write(offset, [data, lenBuf]);
    return Promise.resolve(storage.getSize());
  }

  function appendObj(data: any) {
    return append(new TextEncoder().encode(JSON.stringify(data)));
  }

  async function read(offset: number) {
    console.log("READ", offset);
    const lenBuffer = await storage.read(offset - 2, 2);
    const length = (lenBuffer[0] << 8) | lenBuffer[1];
    return storage.read(offset - 2 - length, length);
  }

  async function readObj(offset: number) {
    const data = await read(offset);
    return JSON.parse(new TextDecoder().decode(data));
  }

  function getLastOffset() {
    return storage.getSize();
  }
}
