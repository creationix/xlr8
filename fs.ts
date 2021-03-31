import { AppendStorage } from "./storage.ts";
import { decode, encode } from "./codec.ts";

export function initialize(storage: AppendStorage): void {
  storage.append(encode({}));
}
type Listing = {
  [path: string]: number;
};

export async function get(
  storage: AppendStorage,
  path: string,
  listingCache: { [offset: number]: Listing } = {},
  listingOffset = storage.getLastOffset(),
): Promise<Uint8Array | void> {
  do {
    const listing = listingCache[listingOffset] || (
      listingCache[listingOffset] = decode(
        await storage.read(listingOffset),
      ) as Listing
    );
    const dataOffset = listing[path];
    // negative offsets are tombstones for deleted files
    if (dataOffset === -1) break;
    if (typeof dataOffset === "number") return storage.read(dataOffset);
    listingOffset = listing[""];
  } while (typeof listingOffset === "number");
}

export async function* iterate(
  storage: AppendStorage,
  listingCache: { [offset: number]: Listing } = {},
  listingOffset = storage.getLastOffset(),
): AsyncGenerator<[string, number]> {
  const seen: { [path: string]: boolean } = { "": true };
  do {
    const listing = listingCache[listingOffset] || (
      listingCache[listingOffset] = decode(
        await storage.read(listingOffset),
      ) as Listing
    );

    for (const path in listing) {
      if (seen[path]) continue;
      seen[path] = true;
      const offset = listing[path];
      // negative offsets are tombstones for deleted files, only show others.
      if (offset >= 0) yield [path, offset];
    }
    listingOffset = listing[""];
  } while (typeof listingOffset === "number");
}

export async function put(
  storage: AppendStorage,
  path: string,
  file: Uint8Array,
): Promise<void> {
  const last = storage.getLastOffset();
  await storage.append(
    encode({ "": last, [path]: await storage.append(file) }),
  );
}

export async function importFolder(
  storage: AppendStorage,
  base: string,
  entries: { [path: string]: number } = { "": storage.getLastOffset() },
) {
  for await (const dirEntry of Deno.readDir(base)) {
    if (dirEntry.name[0] === ".") continue;
    const path = base + "/" + dirEntry.name;
    if (dirEntry.isFile) {
      entries[path] = await storage.append(await Deno.readFile(path));
    } else if (dirEntry.isDirectory) {
      await importFolder(storage, path, entries);
    }
  }
  return storage.append(encode(entries));
}
