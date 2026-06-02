#!/usr/bin/env node

import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const RAW_PREFIX = "raw-captures/";
const ALLOWED_EXTENSIONS = new Set([
  ".dng",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".m4v",
  ".mov",
  ".mp4",
  ".png",
  ".tif",
  ".tiff",
]);

const CONTENT_TYPES = new Map([
  [".dng", "image/x-adobe-dng"],
  [".heic", "image/heic"],
  [".heif", "image/heif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".m4v", "video/x-m4v"],
  [".mov", "video/quicktime"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
]);

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return 0;
  }

  const config = readConfig(args);
  const plan = await buildUploadPlan(args);

  if (plan.files.length === 0) {
    throw new Error("No raw capture files were selected for upload.");
  }

  if (args.dryRun) {
    printPayload({
      ...plan,
      bucket: config.bucket,
      endpoint: config.endpoint,
      dryRun: true,
      files: plan.files.map((file) => ({
        ...file,
        uploaded: false,
        verified: false,
      })),
    }, args.json);
    return 0;
  }

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  try {
    const uploaded = [];

    for (const file of plan.files) {
      const existing = await headObject(client, config.bucket, file.storageKey);

      if (existing.exists && !args.overwrite) {
        throw new Error(`Object already exists; use --overwrite: s3://${config.bucket}/${file.storageKey}`);
      }

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: file.storageKey,
          Body: fs.createReadStream(file.source),
          ContentType: file.contentType,
        }),
      );

      const verified = await headObject(client, config.bucket, file.storageKey);

      uploaded.push({
        ...file,
        uploaded: true,
        verified: verified.exists,
        remoteBytes: verified.bytes,
        lastModified: verified.lastModified,
      });
    }

    printPayload({
      ...plan,
      bucket: config.bucket,
      endpoint: config.endpoint,
      dryRun: false,
      files: uploaded,
    }, args.json);
  } finally {
    client.destroy();
  }

  return 0;
}

function parseArgs(rawArgs) {
  const args = {
    dryRun: false,
    overwrite: false,
    json: false,
    allowAnyExtension: false,
    help: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index];

    if (value === "--dry-run") {
      args.dryRun = true;
    } else if (value === "--overwrite") {
      args.overwrite = true;
    } else if (value === "--json") {
      args.json = true;
    } else if (value === "--allow-any-extension") {
      args.allowAnyExtension = true;
    } else if (value === "--help" || value === "-h") {
      args.help = true;
    } else if (value.startsWith("--")) {
      const key = toCamelCase(value.slice(2));
      const next = rawArgs[index + 1];

      if (!next || next.startsWith("--")) {
        throw new Error(`Missing value for ${value}`);
      }

      args[key] = next;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }

  return args;
}

function readConfig(args) {
  const config = {
    endpoint: readString(args.endpoint) ?? readString(process.env.S3_ENDPOINT),
    region: readString(args.region) ?? readString(process.env.S3_REGION) ?? "us-east-1",
    accessKeyId: readString(args.accessKeyId) ?? readString(process.env.S3_ACCESS_KEY_ID),
    secretAccessKey: readString(args.secretAccessKey) ?? readString(process.env.S3_SECRET_ACCESS_KEY),
    bucket: readString(args.bucket) ?? readString(process.env.RAW_CAPTURE_BUCKET),
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing S3 config: ${missing.join(", ")}`);
  }

  return config;
}

async function buildUploadPlan(args) {
  const inputArg = readString(args.input);

  if (!inputArg) {
    throw new Error("Missing --input.");
  }

  const input = path.resolve(inputArg);
  const inputStat = await fs.promises.lstat(input).catch(() => null);

  if (!inputStat) {
    throw new Error(`Input does not exist: ${input}`);
  }

  if (inputStat.isSymbolicLink()) {
    throw new Error(`Input must not be a symbolic link: ${input}`);
  }

  const sceneId = readString(args.sceneId);
  const baseKey = readString(args.baseKey) ?? defaultBaseKey(args, sceneId, input, inputStat);
  validateRawKey(baseKey.endsWith("/") ? baseKey : `${baseKey}/`);

  const files = inputStat.isDirectory()
    ? await collectDirectoryFiles(input, baseKey, args)
    : [await collectSingleFile(input, baseKey, args)];

  return {
    input,
    baseKey,
    rawAssetKey: files.length === 1 ? files[0].storageKey : baseKey,
    files,
  };
}

async function collectDirectoryFiles(inputDir, baseKey, args) {
  const files = [];
  const entries = await walkFiles(inputDir);

  for (const source of entries) {
    const relative = path.relative(inputDir, source).replace(/\\/g, "/");
    const storageKey = joinKey(baseKey, relative);
    const file = await buildFilePlan(source, storageKey, args);
    files.push(file);
  }

  return files;
}

async function collectSingleFile(inputFile, baseKey, args) {
  const keyArg = readString(args.key);
  const storageKey = keyArg ?? joinKey(baseKey, path.basename(inputFile));
  return buildFilePlan(inputFile, storageKey, args);
}

async function buildFilePlan(source, storageKey, args) {
  validateRawKey(storageKey);

  const stat = await fs.promises.lstat(source);

  if (stat.isSymbolicLink()) {
    throw new Error(`Raw capture file must not be a symbolic link: ${source}`);
  }

  if (!stat.isFile()) {
    throw new Error(`Raw capture input is not a file: ${source}`);
  }

  if (stat.size <= 0) {
    throw new Error(`Raw capture file is empty: ${source}`);
  }

  const extension = path.extname(source).toLowerCase();

  if (!args.allowAnyExtension && !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported raw capture extension ${extension || "(none)"} for ${source}`);
  }

  return {
    source,
    storageKey,
    bytes: stat.size,
    contentType: CONTENT_TYPES.get(extension) ?? "application/octet-stream",
  };
}

async function walkFiles(root) {
  const result = [];
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fs.promises.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isSymbolicLink()) {
        throw new Error(`Raw capture directory contains a symbolic link: ${fullPath}`);
      }

      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }

  return result.sort();
}

async function headObject(client, bucket, key) {
  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      exists: true,
      bytes: result.ContentLength ?? null,
      lastModified: result.LastModified?.toISOString() ?? null,
    };
  } catch {
    return {
      exists: false,
      bytes: null,
      lastModified: null,
    };
  }
}

function defaultBaseKey(args, sceneId, input, inputStat) {
  if (!sceneId) {
    throw new Error("Missing --scene-id when --base-key is not provided.");
  }

  const takeId = readString(args.takeId) ?? (inputStat.isDirectory() ? path.basename(input) : stripExtension(path.basename(input)));
  return `${RAW_PREFIX}${toStorageSegment(sceneId)}/${toStorageSegment(takeId)}`;
}

function joinKey(baseKey, name) {
  return `${baseKey.replace(/\/+$/g, "")}/${name.replace(/^\/+/g, "")}`;
}

function validateRawKey(value) {
  if (!value.startsWith(RAW_PREFIX)) {
    throw new Error(`Raw asset key must start with ${RAW_PREFIX}`);
  }

  if (value.includes("..") || value.includes("\\")) {
    throw new Error(`Raw asset key contains an unsafe path segment: ${value}`);
  }

  if (!/^[a-zA-Z0-9/_\-.]+$/.test(value)) {
    throw new Error(`Raw asset key contains unsupported characters: ${value}`);
  }
}

function toStorageSegment(value) {
  const segment = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!segment) {
    throw new Error("Storage segment must contain at least one safe character.");
  }

  return segment;
}

function stripExtension(filename) {
  const extension = path.extname(filename);
  return extension ? filename.slice(0, -extension.length) : filename;
}

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function printPayload(payload, asJson) {
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`input: ${payload.input}`);
  console.log(`bucket: ${payload.bucket}`);
  console.log(`base key: ${payload.baseKey}`);
  console.log(`raw asset key: ${payload.rawAssetKey}`);
  console.log(`dry-run: ${payload.dryRun}`);

  for (const file of payload.files) {
    const action = file.uploaded ? "uploaded" : "validated";
    const verified = file.verified ? ", verified" : "";
    console.log(`- ${action}${verified}: s3://${payload.bucket}/${file.storageKey} (${file.bytes} bytes)`);
  }
}

function printHelp() {
  console.log(`Upload private raw capture videos/photos to S3/MinIO.

Required:
  --input <path>           Raw video file or image folder

S3 config:
  --endpoint <url>         Defaults to S3_ENDPOINT
  --bucket <name>          Defaults to RAW_CAPTURE_BUCKET
  --region <name>          Defaults to S3_REGION or us-east-1
  --access-key-id <key>    Defaults to S3_ACCESS_KEY_ID
  --secret-access-key <s>  Defaults to S3_SECRET_ACCESS_KEY

Key options:
  --scene-id <slug>        Used for raw-captures/<scene-id>/<take-id>
  --take-id <slug>         Defaults to the input folder/file name
  --base-key <key>         Override raw-captures/<scene-id>/<take-id>
  --key <key>              Single-file key override

Options:
  --dry-run                Validate without uploading
  --overwrite              Replace existing objects
  --json                   Print machine-readable output
  --allow-any-extension    Skip the conservative raw media extension allowlist
`);
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});
