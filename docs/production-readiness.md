# Production prerequisites

This release is a fictional-data demo/starter. Before real investor use, separately design and validate:

- Authentication, authorization/RBAC, tenant isolation and account lifecycle.
- Private durable encrypted document storage; malware scanning; retention, deletion and jurisdiction-specific routing.
- Durable audit events and independently reviewed access controls, backups, recovery and monitoring.
- Jurisdiction/fund-specific eligibility, tax, ownership and onboarding policies with responsible reviewers.
- Independent identity authenticity/liveness, sanctions/PEP/AML and bank control providers; approval authority and operational integrations.
- Labelled classification, extraction, source and case evaluations, false-clear analysis, red-team testing and incident response.

Role tabs, anonymous cookies, literal quote matches, reviewer confirmations and browser exports implement none of those verification or acceptance functions. OpenAI receives classified text and the extraction PDF; Redis only stores quota counters. `store:false` is an API request option, not a promise of zero provider retention. Review your own provider terms, data controls and legal requirements before using private data.
