import { memoryStorage } from "./storage.ts";
import { importFolder, initialize, iterate } from "./fs.ts";

const storage = memoryStorage();
initialize(storage);

const conquest = await importFolder(storage, "./conquest");
const exploder = await importFolder(storage, "./exploder");
const lit = await importFolder(storage, "./lit");
const luvit = await importFolder(storage, "./luvit");
const all = await importFolder(storage, ".");
const cache = {};
console.log("Iterating at conquest...");
for await (const path of iterate(storage, cache, conquest)) {
  console.log(path);
}
console.log("Iterating at exploder...");
for await (const path of iterate(storage, cache, exploder)) {
  console.log(path);
}
console.log("Iterating at lit...");
for await (const path of iterate(storage, cache, lit)) {
  console.log(path);
}
console.log("Iterating at luvit...");
for await (const path of iterate(storage, cache, luvit)) {
  console.log(path);
}

console.log("Iterating at all...");
for await (const path of iterate(storage, cache, all)) {
  console.log(path);
}

console.log("Storage entries", storage.pieces.length);
console.log(
  "Total storage",
  storage.pieces.reduce((total, current) => total + current.byteLength, 0),
);
