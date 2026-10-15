# Security

This is a fictional-data demo, not a production onboarding service. Do not upload real investor documents. Role tabs are not authentication or authorization.

Report suspected vulnerabilities using GitHub's private vulnerability reporting for this repository when available. Otherwise contact the maintainer through their GitHub profile to arrange a private channel; do not put credentials or investor files in a public issue. We do not promise a response SLA.

Provider keys, session signing and Redis URLs belong only in server runtime environment. Never use NEXT_PUBLIC_ secrets or build arguments. Rotate exposed credentials. Redis failure denies provider dispatch. Deployers must protect their Redis and share one namespace/store across instances. Resetting Redis/namespace resets budgets; it is not a billing account spending limit. Configure provider account spending controls separately.

All PDFs and their text are untrusted. The demo limits upload bytes/pages/text, uses structured outputs and deterministic source checks, and performs no external identity, AML, tax, bank-control or investor acceptance checks. Parsing limits are not malware scanning. Redis counters contain opaque session hashes, not PDFs. Paid optional evaluation outputs are private and gitignored by default.
