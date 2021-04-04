import { brightGreen } from "https://deno.land/std@0.91.0/fmt/colors.ts";
import { format } from "./format-block.ts";
import { Sha256 } from "https://deno.land/std@0.91.0/hash/sha256.ts";
import { encodeToString as hexify } from "https://deno.land/std@0.91.0/encoding/hex.ts";

interface HashStorage {
  /** using hash load and write data to block */
  get(hash: Uint8Array, block: Uint8Array): Promise<void>;
  /** using  block, store and write hash */
  put(block: Uint8Array, hash: Uint8Array): Promise<void>;
}

interface BlockStorage {
  get(index: number, block: Uint8Array): Promise<void>;
  put(index: number, block: Uint8Array): Promise<void>;
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
  private blocks: { [hash: string]: Uint8Array };
  constructor() {
    this.blocks = {};
  }

  /** using hash load and write data to block */
  async get(hash: Uint8Array, block: Uint8Array): Promise<void> {
    if (hash.length !== 32) throw new TypeError("Hash must be 32 bytes long");
    const hex = hexify(hash);
    // Await simulates I/O
    const data = await this.blocks[hex];
    if (!data) throw new ReferenceError(`No such hash ${hex}`);
    block.set(data);
  }

  /** using block, store and write hash */
  async put(block: Uint8Array, hash: Uint8Array): Promise<void> {
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
  private rootHash: Uint8Array;

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
      await this.hashes.put(emptyBlock, this.rootHash);
      if (--depth < 0) break;
      for (let i = 0, l = Math.pow(2, this.blockPower - 5); i < l; i++) {
        emptyBlock.set(this.rootHash, i << 5);
      }
    }
  }

  private async getChildHash(
    parentHash: Uint8Array,
    subIndex: number,
  ): Promise<Uint8Array> {
    const parent = new Uint8Array(this.blockSize);
    await this.hashes.get(parentHash, parent);
    return parent.subarray(subIndex << 5, (subIndex << 5) + 32);
  }

  private async getHashChain(
    depth: number,
    index: number,
    chain: Uint8Array[],
  ): Promise<void> {
    if (depth == 0) {
      chain.push(this.rootHash);
      return;
    }
    await this.getHashChain(depth - 1, index >> (this.blockPower - 5), chain);
    const subIndex = index % (Math.pow(2, this.blockPower - 5));
    const childHash = await this.getChildHash(
      chain[chain.length - 1],
      subIndex,
    );
    chain.push(childHash);
  }

  async get(index: number, block: Uint8Array): Promise<void> {
    const chain: Uint8Array[] = [];
    await this.getHashChain(this.recursionDepth, index, chain);
    this.hashes.get(chain[chain.length - 1], block);
  }

  async put(index: number, block: Uint8Array): Promise<void> {
  }
}

const mem = new MemHashStorage();
const storage = new CaifyStorage(mem, 7, 2);
console.log({ mem, storage });
await storage.initialize();
console.log({ mem, storage });
const result = new Uint8Array(storage.blockSize);
for (let i = 0; i < storage.blockCount; i++) {
  await storage.get(0, result);
  console.log(result);
}

// const buffer = new Uint8Array(10);
// dev.read(0, buffer);
// format(buffer);
// // console.log(dev);
// console.log();
// console.log("Block Size", humanSize(Math.pow(2, power)));
// console.log("Recursion Depth", depth);
// const usedSpace = Object.keys(blocks).length * dev.blockSize;
// console.log("Used Space", usedSpace, humanSize(usedSpace));
// const availableSpace = dev.blockCount * dev.blockSize;
// console.log("Available Space", availableSpace, humanSize(availableSpace));
// const hashesPerBlock = dev.blockSize >> 5;
// let overhead = 32;
// let i = depth;
// while (i) {
//   overhead += Math.pow(hashesPerBlock, --i) * dev.blockSize;
// }
// console.log("Overhead Space", overhead, humanSize(overhead));
// console.log(
//   "Overhead percentage",
//   (overhead / availableSpace * 100).toFixed(3) + "%",
// );
// console.log(dev);

// for (const hex in blocks) {
//   console.log(format(blocks[hex]));
//   console.log(brightGreen(hex));
// }

// function humanSize(size: number): string {
//   if (size < 0x400) {
//     return `${size} bytes`;
//   }
//   if (size < 0x100000) {
//     return `${(size / 0x400).toFixed(2)} KiB`;
//   }
//   if (size < 0x40000000) {
//     return `${(size / 0x100000).toFixed(2)} MiB`;
//   }
//   if (size < 0x10000000000) {
//     return `${(size / 0x40000000).toFixed(2)} GiB`;
//   }
//   if (size < 0x4000000000000) {
//     return `${(size / 0x10000000000).toFixed(2)} TiB`;
//   }
//   if (size < 0x1000000000000000) {
//     return `${(size / 0x4000000000000).toFixed(2)} PiB`;
//   }
//   return `${(size / 0x1000000000000000).toFixed(2)} EiB`;
// }
