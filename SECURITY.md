# Security Policy

## Supported Versions

StockSense is actively maintained. Security updates and patches are applied to the latest release on `main`.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The StockSense development team takes security and data integrity very seriously. If you discover a vulnerability or security risk, please follow these guidelines:

1. **Do not open a public issue.**
2. Report the vulnerability privately by emailing our security team at [security@stocksense.app](mailto:security@stocksense.app).
3. Include detailed steps to reproduce the issue, proof of concept (PoC), and the impacted components or endpoints.

### What to Expect

- **Acknowledgment**: Within 24 hours of report receipt.
- **Triage & Assessment**: Within 48 hours with a severity rating (CVSS).
- **Remediation**: A hotfix or patch will be developed, reviewed, and released with an advisory.

## Security Practices in StockSense

- **Strict Role-Based Access Control (RBAC)** enforced at both Frontend and Backend API levels.
- **Cryptographic Security**: Passwords hashed with Bcrypt (10 salt rounds), JWTs signed with HMAC-SHA256.
- **Transaction Safety**: All stock-altering operations executed inside atomic database transactions (`prisma.$transaction`) with zero-floor negative stock protection.
- **Audit Logging**: Immutable, append-only Stock Ledger for all inventory movements.
