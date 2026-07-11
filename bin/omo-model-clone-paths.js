import { existsSync, lstatSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

export function assertAbsoluteHome(home, label) {
  if (typeof home !== "string" || !isAbsolute(home)) throw new Error(`${label} home must be absolute`);
  assertExistingChainSafe(home, `${label} home`);
  if (!statSync(home).isDirectory()) throw new Error(`${label} home must be a directory`);
  return realpathSync.native(home);
}

export function assertRegularPath(file, label) {
  assertExistingChainSafe(file, label);
  const info = lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink() || isReparse(info) || info.nlink !== 1) throw new Error(`${label} must be a single-link regular non-reparse file`);
}

export function canonicalNewPath(path, label) {
  const lexical = resolve(path);
  if (existsSync(lexical)) throw new Error(`${label} already exists`);
  const parent = dirname(lexical);
  assertExistingChainSafe(parent, `${label} parent`);
  if (!statSync(parent).isDirectory()) throw new Error(`${label} parent must be a directory`);
  return resolve(realpathSync.native(parent), basename(lexical));
}

export function assertOutsideProtected(target, home, label) {
  const roots = [resolve(home, ".config", "opencode"), resolve(home, ".local", "bin")];
  for (const root of roots) {
    const canonicalRoot = canonicalExistingOrFuture(root);
    if (atOrInside(canonicalRoot, target) || atOrInside(target, canonicalRoot)) throw new Error(`${label} conflicts with a protected config or launcher root`);
  }
}

export function assertExistingChainSafe(path, label) {
  const absolute = resolve(path);
  const anchor = absolute.slice(0, absolute.indexOf(sep) + 1);
  let current = anchor;
  for (const segment of absolute.slice(anchor.length).split(sep).filter(Boolean)) {
    current = resolve(current, segment);
    if (!existsSync(current)) throw new Error(`${label} does not exist`);
    const info = lstatSync(current);
    if (info.isSymbolicLink() || isReparse(info)) throw new Error(`${label} contains a symlink, junction, or reparse component`);
  }
}

function canonicalExistingOrFuture(path) {
  const suffix = [];
  let current = resolve(path);
  while (!existsSync(current)) {
    suffix.unshift(basename(current));
    current = dirname(current);
  }
  return resolve(realpathSync.native(current), ...suffix);
}

function atOrInside(root, target) {
  const left = process.platform === "win32" ? root.toLowerCase() : root;
  const right = process.platform === "win32" ? target.toLowerCase() : target;
  const rel = relative(left, right);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function isReparse(info) {
  return process.platform === "win32" && (info.mode & 0o120000) === 0o120000;
}
