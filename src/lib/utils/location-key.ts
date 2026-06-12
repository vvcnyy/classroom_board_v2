export function romanizeKorean(input: string): string {
  const cho = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
  const jung = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
  const jong = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "p", "l", "l", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t", "t"];
  const base = 0xac00;
  const last = 0xd7a3;

  let output = "";
  for (const ch of input) {
    const code = ch.codePointAt(0);
    if (!code || code < base || code > last) {
      output += ch;
      continue;
    }
    const index = code - base;
    let chunk = cho[Math.floor(index / 588)] + jung[Math.floor((index % 588) / 28)] + jong[index % 28];
    chunk = chunk.replace(/kk/g, "k").replace(/tt/g, "t").replace(/pp/g, "p").replace(/ss/g, "s");
    output += chunk;
  }
  return output;
}

export function makeLocationKey(label: string): string {
  const key = romanizeKorean(label.trim())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return key || "unknown";
}
