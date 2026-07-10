import assert from "node:assert/strict";
import test from "node:test";
import { createZip, readZip } from "../bin/omo-model-pack-zip.js";

function replaceZipEntryPath(archive, originalPath, replacementPath) {
  const original = Buffer.from(originalPath, "utf8");
  const replacement = Buffer.from(replacementPath, "utf8");
  assert.equal(replacement.length, original.length);
  const changed = Buffer.from(archive);
  let replacements = 0;
  let offset = changed.indexOf(original);
  while (offset !== -1) {
    replacement.copy(changed, offset);
    replacements += 1;
    offset = changed.indexOf(original, offset + replacement.length);
  }
  assert.equal(replacements, 2);
  return changed;
}

test("ZIP parser rejects Windows drive-prefixed entry paths", () => {
  for (const [validPath, unsafePath] of [["safe/path", "C:/escape"], ["safepath", "C:escape"]]) {
    const archive = createZip([{ data: Buffer.from("data", "utf8"), path: validPath }]);
    assert.deepEqual(readZip(archive), [{ data: Buffer.from("data", "utf8"), path: validPath }]);
    const untrustedArchive = replaceZipEntryPath(archive, validPath, unsafePath);
    assert.throws(() => readZip(untrustedArchive), /unsafe ZIP entry path/i);
    assert.throws(() => createZip([{ data: Buffer.alloc(0), path: unsafePath }]), /unsafe ZIP entry path/i);
  }
});
