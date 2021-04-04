import { brightBlue } from "https://deno.land/std@0.91.0/fmt/colors.ts";

export function format(data: Uint8Array) {
  const bytes = new Uint8Array(data.buffer);
  let out =
    "         ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n";
  out += `         ┃${
    brightBlue(
      "  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f 10 11 12 13 14 15 16 17 18 19 1a 1b 1c 1d 1e 1f ",
    )
  }┃\n`;
  out +=
    "┏━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n";

  const lineCount = Math.ceil(bytes.length / 32);

  for (let line = 0; line < lineCount; line++) {
    const start = line * 32;
    const addr = start.toString(16).padStart(8, "0");
    const lineBytes = bytes.slice(start, start + 32);

    out += `┃${brightBlue(addr)}┃ `;

    lineBytes.forEach(
      (byte) => (out += byte.toString(16).padStart(2, "0") + " "),
    );

    if (lineBytes.length < 16) {
      out += "   ".repeat(16 - lineBytes.length);
    }

    out += "┃";

    lineBytes.forEach(function (byte) {
      return (out += byte > 31 && byte < 127
        ? brightBlue(String.fromCharCode(byte))
        : ".");
    });

    if (lineBytes.length < 16) {
      out += " ".repeat(16 - lineBytes.length);
    }

    out += "┃\n";
  }
  out +=
    "┗━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛";
  return out;
}
