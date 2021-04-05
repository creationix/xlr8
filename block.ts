import { brightGreen } from "https://deno.land/std@0.91.0/fmt/colors.ts";
import { format } from "./format-block.ts";
import { Sha256 } from "https://deno.land/std@0.91.0/hash/sha256.ts";
import { encodeToString as hexify } from "https://deno.land/std@0.91.0/encoding/hex.ts";

interface HashStorage {
  /** using hash load and write data to block */
  get(hash: Uint8Array, block: Uint8Array): Promise<void>;
  /** using  block, store and write hash */
  set(block: Uint8Array, hash: Uint8Array): Promise<void>;
}

interface BlockStorage {
  get(index: number, block: Uint8Array): Promise<void>;
  set(index: number, block: Uint8Array): Promise<void>;
  blockSize: number;
  blockCount: number;
}

interface BlockDevice extends BlockStorage {
  read(offset: number, bytes: Uint8Array): Promise<void>;
  write(offset: number, bytes: Uint8Array): Promise<void>;
  unmount(): Promise<void>;
  flush(): Promise<void>;
}

class MemHashStorage implements HashStorage {
  blocks: { [hash: string]: Uint8Array };
  constructor() {
    this.blocks = {};
  }

  /** using hash load and write data to block */
  async get(hash: Uint8Array, block: Uint8Array): Promise<void> {
    if (hash.length !== 32) throw new TypeError("Hash must be 32 bytes long");
    const hex = hexify(hash);
    // Await simulates I/O
    const data = await this.blocks[hex].slice(0);
    if (!data) throw new ReferenceError(`No such hash ${hex}`);
    block.set(data);
  }

  /** using block, store and write hash */
  async set(block: Uint8Array, hash: Uint8Array): Promise<void> {
    if (hash.length !== 32) throw new TypeError("Hash must be 32 bytes long");
    hash.set(new Sha256().update(block).digest());
    const hex = hexify(hash);
    // Await simulates I/O
    await (this.blocks[hex] = block.slice(0));
  }
}

class CaifyStorage implements BlockStorage {
  private hashes: HashStorage;
  private blockPower: number;
  private recursionDepth: number;
  rootHash: Uint8Array;

  readonly blockSize: number;
  readonly blockCount: number;

  // Default to 1Kib blocks and 1 level of recursion.
  constructor(hashes: HashStorage, blockPower = 10, recursionDepth = 1) {
    if (blockPower < 6) {
      throw new TypeError("blockPower must be at least 6 (64 bytes)");
    }
    if (blockPower > 15) {
      throw new TypeError("blockPower must be at most 15 (32K)");
    }
    if (recursionDepth < 0) {
      throw new TypeError("recursionDepth must be positive");
    }

    this.hashes = hashes;
    this.blockSize = Math.pow(2, blockPower);
    this.blockCount = Math.pow(2, (blockPower - 5) * recursionDepth);
    this.blockPower = blockPower;
    this.recursionDepth = recursionDepth;
    this.rootHash = new Uint8Array(32);
  }

  async initialize(): Promise<void> {
    // Initialize empty data set
    const emptyBlock = new Uint8Array(this.blockSize);
    let depth = this.recursionDepth;
    while (true) {
      await this.hashes.set(emptyBlock, this.rootHash);
      if (--depth < 0) break;
      for (let i = 0, l = Math.pow(2, this.blockPower - 5); i < l; i++) {
        emptyBlock.set(this.rootHash, i << 5);
      }
    }
  }

  async get(
    index: number,
    block: Uint8Array,
    minHeight = 0,
  ): Promise<void> {
    let parentHash = this.rootHash;
    const parent = new Uint8Array(this.blockSize);
    const bitsPerLevel = this.blockPower - 5;
    const hashesPerBlock = Math.pow(2, bitsPerLevel);
    for (let height = this.recursionDepth - 1; height >= minHeight; height--) {
      await this.hashes.get(parentHash, parent);
      const offset = ((index >>> (height * bitsPerLevel)) % hashesPerBlock) <<
        5;
      parentHash = parent.subarray(offset, offset + 32);
    }
    this.hashes.get(parentHash, block);
  }

  async set(index: number, block: Uint8Array): Promise<void> {
    // Store the value in a new hash block.
    const hash = new Uint8Array(32);
    await this.hashes.set(block, hash);

    // Recursively set the entry in the parent nodes
    const parent = new Uint8Array(this.blockSize);
    const bitsPerLevel = this.blockPower - 5;
    const hashesPerBlock = Math.pow(2, bitsPerLevel);
    for (let height = 1; height <= this.recursionDepth; height++) {
      await this.get(index, parent, height);
      const offset =
        ((index >>> ((height - 1) * bitsPerLevel)) % hashesPerBlock) <<
        5;
      parent.set(hash, offset);
      await this.hashes.set(parent, hash);
    }
    // Update root hash
    this.rootHash = hash;
  }
}

const mem = new MemHashStorage();
const storage = new CaifyStorage(mem, 7, 2);
console.log({ mem, storage });
await storage.initialize();
console.log({ mem, storage });
const result = new Uint8Array(storage.blockSize);
for (let i = 0; i < storage.blockCount; i++) {
  await storage.get(i, result);
  // console.log("empty", i);
  // console.log(format(result));
  result.fill(i);
  await storage.set(i, result);
  // console.log("Writing", i);
  // console.log(format(result));
  await storage.get(i, result);
  console.log("Filled", i);
  console.log(format(result));
  // break;
}

for (const hash in mem.blocks) {
  console.log(format(mem.blocks[hash]));
  console.log(hash);
}
console.log("root hash", hexify(storage.rootHash));
