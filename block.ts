import { format } from "https://deno.land/x/bytes_formater@v1.4.0/mod.ts";
import { Sha256 } from "https://deno.land/std@0.91.0/hash/sha256.ts";

interface BlockDevice {
  read(offset: number, bytes: Uint8Array): Promise<void>;
  write(offset: number, bytes: Uint8Array): Promise<void>;
  unmount(): Promise<void>;
  flush(): Promise<void>;
  blockSize: number;
  blockCount: number;
}

let blocks: { [hash: string]: Uint8Array } = {};
function save(data: Uint8Array): Uint8Array {
  const hash = new Sha256().update(data);
  blocks[hash.hex()] = data.slice(0);
  return new Uint8Array(hash.arrayBuffer());
}

export class CaifyBlockDevice implements BlockDevice {
  readonly blockSize: number;
  readonly blockCount: number;
  private hashesPerBlock: number;
  private recursionDepth: number;
  rootHash: Uint8Array;

  constructor(blockSize = 0x1000, recursionDepth = 3) {
    this.blockSize = blockSize;
    this.recursionDepth = recursionDepth;
    this.hashesPerBlock = blockSize >> 5;
    this.blockCount = Math.pow(this.hashesPerBlock, recursionDepth);

    const emptyBlock = new Uint8Array(blockSize);
    while (true) {
      this.rootHash = save(emptyBlock);
      if (--recursionDepth <= 0) break;
      for (let i = 0; i < this.hashesPerBlock; i++) {
        emptyBlock.set(this.rootHash, i << 5);
      }
    }
  }

  async read(offset: number, bytes: Uint8Array) {
  }

  async write(offset: number, bytes: Uint8Array) {
  }

  async unmount() {
  }

  async flush() {
  }
}

// Block sizes in powers of two from 4k to 32k
const blockSizes = [0x800, 0x1000, 0x2000, 0x4000, 0x8000]
const recursions = [1, 2, 3, 4]
for (const depth of recursions) {
  for (const size of blockSizes) {
    blocks = {};
    const dev = new CaifyBlockDevice(size, depth);
    // console.log(dev);
    console.log()
    console.log("Block Size", humanSize(size));
    console.log("Recursion Depth", depth);
    const usedSpace = Object.keys(blocks).length * dev.blockSize
    console.log("Used Space", usedSpace, humanSize(usedSpace));
    const availableSpace = dev.blockCount * dev.blockSize;
    console.log("Available Space", availableSpace, humanSize(availableSpace));
    const hashesPerBlock = dev.blockSize >> 5;
    let overhead = 0
    let i = depth;
    while (i) {
      overhead += Math.pow(hashesPerBlock, --i) * dev.blockSize
    }
    console.log("Overhead Space", overhead, humanSize(overhead));
    console.log("Overhead percentage", (overhead / availableSpace * 100).toFixed(3) + "%");
    // console.log(format(dev.rootHash));
  }
}

// for (const hex in blocks) {
//   console.log(format(blocks[hex].slice(0, 128)));
//   console.log(hex);
// }


function humanSize(size: number): string {
  if (size < 0x400) {
    return `${size} bytes`
  }
  if (size < 0x100000) {
    return `${(size / 0x400).toFixed(2)} KiB`
  }
  if (size < 0x40000000) {
    return `${(size / 0x100000).toFixed(2)} MiB`
  }
  if (size < 0x10000000000) {
    return `${(size / 0x40000000).toFixed(2)} GiB`
  }
  if (size < 0x4000000000000) {
    return `${(size / 0x10000000000).toFixed(2)} TiB`
  }
  if (size < 0x1000000000000000) {
    return `${(size / 0x4000000000000).toFixed(2)} PiB`
  }
  return `${(size / 0x1000000000000000).toFixed(2)} EiB`
}