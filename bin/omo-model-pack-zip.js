const CENTRAL_DIRECTORY = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const LOCAL_FILE = 0x04034b50;
const MAX_ENTRIES = 32;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const UTF8_FLAG = 0x0800;

const crcTable = buildCrcTable();

export function createZip(entries) {
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_ENTRIES) throw new Error("Invalid ZIP entry count");
  const names = new Set();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let totalBytes = 0;

  for (const entry of entries) {
    validatePath(entry.path);
    if (names.has(entry.path)) throw new Error(`Duplicate ZIP entry '${entry.path}'`);
    names.add(entry.path);
    const name = Buffer.from(entry.path, "utf8");
    const data = Buffer.from(entry.data);
    if (data.length > MAX_ENTRY_BYTES) throw new Error(`ZIP entry '${entry.path}' exceeds the size limit`);
    totalBytes += data.length;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("ZIP exceeds the total size limit");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_FILE, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_DIRECTORY, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export function readZip(archive) {
  const buffer = Buffer.from(archive);
  const endOffset = findEndOfCentralDirectory(buffer);
  assertRange(buffer, endOffset, 22, "truncated ZIP footer");
  if (buffer.readUInt16LE(endOffset + 4) !== 0 || buffer.readUInt16LE(endOffset + 6) !== 0) throw new Error("Multi-disk ZIP archives are unsupported");
  const entries = buffer.readUInt16LE(endOffset + 10);
  const directoryBytes = buffer.readUInt32LE(endOffset + 12);
  const directoryOffset = buffer.readUInt32LE(endOffset + 16);
  if (entries === 0 || entries > MAX_ENTRIES) throw new Error("Invalid ZIP entry count");
  assertRange(buffer, directoryOffset, directoryBytes, "truncated ZIP central directory");
  if (directoryOffset + directoryBytes !== endOffset) throw new Error("Unexpected ZIP central directory layout");

  const result = [];
  const names = new Set();
  let cursor = directoryOffset;
  let totalBytes = 0;
  for (let index = 0; index < entries; index += 1) {
    assertRange(buffer, cursor, 46, "truncated ZIP central entry");
    if (buffer.readUInt32LE(cursor) !== CENTRAL_DIRECTORY) throw new Error("Invalid ZIP central entry");
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const crc = buffer.readUInt32LE(cursor + 16);
    const compressedBytes = buffer.readUInt32LE(cursor + 20);
    const bytes = buffer.readUInt32LE(cursor + 24);
    const nameBytes = buffer.readUInt16LE(cursor + 28);
    const extraBytes = buffer.readUInt16LE(cursor + 30);
    const commentBytes = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const centralLength = 46 + nameBytes + extraBytes + commentBytes;
    assertRange(buffer, cursor, centralLength, "truncated ZIP entry metadata");
    if (flags !== UTF8_FLAG || method !== 0 || compressedBytes !== bytes) throw new Error("Unsupported ZIP compression or flags");
    if (bytes > MAX_ENTRY_BYTES) throw new Error("ZIP entry exceeds the size limit");
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("ZIP exceeds the total size limit");
    const path = buffer.toString("utf8", cursor + 46, cursor + 46 + nameBytes);
    validatePath(path);
    if (names.has(path)) throw new Error(`Duplicate ZIP entry '${path}'`);
    names.add(path);
    const data = readLocalFile(buffer, localOffset, path, bytes, crc);
    result.push({ data, path });
    cursor += centralLength;
  }
  if (cursor !== directoryOffset + directoryBytes) throw new Error("Unexpected ZIP central directory length");
  return result;
}

function readLocalFile(buffer, offset, expectedPath, bytes, expectedCrc) {
  assertRange(buffer, offset, 30, "truncated ZIP local entry");
  if (buffer.readUInt32LE(offset) !== LOCAL_FILE) throw new Error("Invalid ZIP local entry");
  const flags = buffer.readUInt16LE(offset + 6);
  const method = buffer.readUInt16LE(offset + 8);
  const crc = buffer.readUInt32LE(offset + 14);
  const compressedBytes = buffer.readUInt32LE(offset + 18);
  const rawBytes = buffer.readUInt32LE(offset + 22);
  const nameBytes = buffer.readUInt16LE(offset + 26);
  const extraBytes = buffer.readUInt16LE(offset + 28);
  if (flags !== UTF8_FLAG || method !== 0 || rawBytes !== bytes || compressedBytes !== bytes || crc !== expectedCrc) throw new Error("ZIP local entry does not match central directory");
  const headerBytes = 30 + nameBytes + extraBytes;
  assertRange(buffer, offset, headerBytes + bytes, "truncated ZIP entry data");
  const path = buffer.toString("utf8", offset + 30, offset + 30 + nameBytes);
  if (path !== expectedPath) throw new Error("ZIP local entry path mismatch");
  const data = buffer.subarray(offset + headerBytes, offset + headerBytes + bytes);
  if (crc32(data) !== expectedCrc) throw new Error(`ZIP checksum mismatch for '${expectedPath}'`);
  return data;
}

function findEndOfCentralDirectory(buffer) {
  const minimum = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY && offset + 22 + buffer.readUInt16LE(offset + 20) === buffer.length) return offset;
  }
  throw new Error("ZIP end-of-directory record is missing");
}

function validatePath(path) {
  if (typeof path !== "string" || path.length === 0 || /^[A-Za-z]:/.test(path) || path.startsWith("/") || path.includes("\\")) throw new Error("Unsafe ZIP entry path");
  if (path.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..")) throw new Error("Unsafe ZIP entry path");
}

function assertRange(buffer, offset, bytes, message) {
  if (offset < 0 || bytes < 0 || offset + bytes > buffer.length) throw new Error(message);
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 0 ? value >>> 1 : (value >>> 1) ^ 0xedb88320;
    table[index] = value >>> 0;
  }
  return table;
}
