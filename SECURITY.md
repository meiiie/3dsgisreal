# Security Policy

## Supported Versions

This project is in active pre-production development. Security fixes target the `main` branch.

## Reporting A Vulnerability

Please do not open a public issue for sensitive security reports.

Use GitHub's private vulnerability reporting or another private maintainer channel when available. Include:

- affected route, API, script, or workflow
- impact and realistic attack path
- reproduction steps
- relevant logs or screenshots without secrets
- suggested fix, if known

## Sensitive Data Rules

Never commit or upload:

- raw room/location capture media
- private addresses or consent evidence
- `.env` files or cloud tokens
- S3/MinIO credentials
- GPU provider tokens
- private PLY/SOG outputs from real places

## Security Baseline

The project uses OWASP-aware server validation and access-control practice. Future auth, upload, admin, and user-data features should be reviewed against the current guidance in `docs/12-quality-standards-and-practice.md` and `docs/13-practice-register.md`.
