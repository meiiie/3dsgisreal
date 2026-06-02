#!/usr/bin/env node

import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ARTIFACTS = [
  {
    kind: "content",
    label: "SOG content",
    defaultName: "scene.sog",
    outputName: "scene.sog",
    required: true,
    contentType: "application/octet-stream",
  },
  {
    kind: "settings",
    label: "settings.json",
    defaultName: "settings.json",
    outputName: "settings.json",
    required: true,
    contentType: "application/json",
    jsonObject: true,
  },
  {
    kind: "collision",
    label: "collision.voxel.json",
    defaultName: "collision.voxel.json",
    outputName: "collision.voxel.json",
    required: true,
    contentType: "application/json",
    jsonObject: true,
  },
  {
    kind: "poster",
    label: "poster",
    defaultName: "poster.webp",
    outputName: "poster.webp",
    required: true,
    contentType: "image/webp",
  },
];

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return 0;
  }

  const config = readConfig(args);
  const plan = await buildUploadPlan(args);

  if (plan.artifacts.length === 0) {
    throw new Error("No artifacts were selected for upload.");
  }

  if (args.dryRun) {
    printPayload({
      ...plan,
      bucket: config.bucket,
      endpoint: config.endpoint,
      dryRun: true,
      artifacts: plan.artifacts.map((artifact) => ({
        ...artifact,
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

    for (const artifact of plan.artifacts) {
      const existing = await headObject(client, config.bucket, artifact.storageKey);

      if (existing.exists && !args.overwrite) {
        throw new Error(`Object already exists; use --overwrite: s3://${config.bucket}/${artifact.storageKey}`);
      }

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: artifact.storageKey,
          Body: fs.createReadStream(artifact.source),
          ContentType: artifact.contentType,
        }),
      );

      const verified = await headObject(client, config.bucket, artifact.storageKey);

      uploaded.push({
        ...artifact,
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
      artifacts: uploaded,
    }, args.json);
  } finally {
    client.destroy();
  }

  return 0;
}

function parseArgs(rawArgs) {
  const args = {
    version: 1,
    dryRun: false,
    overwrite: false,
    json: false,
    allowMissingOptional: false,
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
    } else if (value === "--allow-missing-optional") {
      args.allowMissingOptional = true;
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
    bucket: readString(args.bucket) ?? readString(process.env.SCENE_ASSETS_BUCKET),
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
  const sceneId = readString(args.sceneId);

  if (!sceneId) {
    throw new Error("Missing --scene-id.");
  }

  const inputDirArg = readString(args.inputDir);

  if (!inputDirArg) {
    throw new Error("Missing --input-dir.");
  }

  const inputDir = path.resolve(inputDirArg);
  const stat = await fs.promises.stat(inputDir).catch(() => null);

  if (!stat?.isDirectory()) {
    throw new Error(`Input directory does not exist: ${inputDir}`);
  }

  const version = readPositiveInt(args.version, "version");
  const baseKey = readString(args.baseKey) ?? `scenes/${toStorageSegment(sceneId)}/v${version}`;
  const artifacts = [];

  for (const spec of withUserFilenames(args)) {
    const source = path.resolve(inputDir, spec.filename);
    ensureInside(inputDir, source, "source");

    const exists = await fileExists(source);

    if (!exists) {
      if (spec.required || !args.allowMissingOptional) {
        throw new Error(`Missing required artifact: ${source}`);
      }
      continue;
    }

    const bytes = await validateArtifact(source, spec);

    artifacts.push({
      kind: spec.kind,
      label: spec.label,
      source,
      storageKey: `${baseKey}/${spec.outputName}`,
      bytes,
      contentType: spec.contentType,
    });
  }

  return {
    sceneId,
    version,
    inputDir,
    baseKey,
    artifacts,
  };
}

function withUserFilenames(args) {
  const filenames = {
    content: readString(args.content) ?? "scene.sog",
    settings: readString(args.settings) ?? "settings.json",
    collision: readString(args.collision) ?? "collision.voxel.json",
    poster: readString(args.poster) ?? "poster.webp",
  };

  return ARTIFACTS.map((spec) => ({
    ...spec,
    filename: filenames[spec.kind],
    required: args.allowMissingOptional && spec.kind !== "content" ? false : spec.required,
  }));
}

async function validateArtifact(source, spec) {
  const stat = await fs.promises.stat(source);

  if (!stat.isFile()) {
    throw new Error(`Artifact is not a file: ${source}`);
  }

  if (stat.size <= 0) {
    throw new Error(`Artifact is empty: ${source}`);
  }

  if (spec.jsonObject) {
    const parsed = JSON.parse(await fs.promises.readFile(source, "utf8"));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`JSON artifact must be an object: ${source}`);
    }
  }

  return stat.size;
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

function ensureInside(root, child, label) {
  const relative = path.relative(root, child);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} path escapes input directory: ${child}`);
  }
}

async function fileExists(filePath) {
  const stat = await fs.promises.stat(filePath).catch(() => null);
  return Boolean(stat?.isFile());
}

function toStorageSegment(value) {
  const segment = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!segment) {
    throw new Error("Scene id must contain at least one storage-safe character.");
  }

  return segment;
}

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readPositiveInt(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be an integer >= 1.`);
  }

  return parsed;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function printPayload(payload, asJson) {
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`scene: ${payload.sceneId} v${payload.version}`);
  console.log(`bucket: ${payload.bucket}`);
  console.log(`base key: ${payload.baseKey}`);
  console.log(`dry-run: ${payload.dryRun}`);

  for (const artifact of payload.artifacts) {
    const action = artifact.uploaded ? "uploaded" : "validated";
    const verified = artifact.verified ? ", verified" : "";
    console.log(`- ${artifact.label}: ${action}${verified} -> s3://${payload.bucket}/${artifact.storageKey} (${artifact.bytes} bytes)`);
  }
}

function printHelp() {
  console.log(`Upload scene runtime artifacts to S3/MinIO.

Required:
  --input-dir <path>       Folder containing scene.sog/settings/collision/poster
  --scene-id <slug>        Scene id, for example home-test-room-v1

S3 config:
  --endpoint <url>         Defaults to S3_ENDPOINT
  --bucket <name>          Defaults to SCENE_ASSETS_BUCKET
  --region <name>          Defaults to S3_REGION or us-east-1
  --access-key-id <key>    Defaults to S3_ACCESS_KEY_ID
  --secret-access-key <s>  Defaults to S3_SECRET_ACCESS_KEY

Options:
  --version <n>            Asset version, default 1
  --base-key <key>         Override scenes/<scene-id>/v<version>
  --dry-run                Validate without uploading
  --overwrite              Replace existing objects
  --json                   Print machine-readable output
  --allow-missing-optional Only require scene.sog
`);
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});
