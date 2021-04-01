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

const blocks: { [hash: string]: Uint8Array } = {};
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

const dev = new CaifyBlockDevice(0x1000, 3);
// console.log(blocks);

for (const hex in blocks) {
  console.log(format(blocks[hex].slice(0, 32)));
  console.log(hex);
}
console.log(format(dev.rootHash));

console.log(dev);
console.log("Used Space", Object.keys(blocks).length * dev.blockSize);
console.log("Available Space", dev.blockCount * dev.blockSize);
