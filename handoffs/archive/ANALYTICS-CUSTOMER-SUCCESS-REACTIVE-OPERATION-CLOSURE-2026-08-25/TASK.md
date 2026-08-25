# TASK

- Task: ANALYTICS-CUSTOMER-SUCCESS-REACTIVE-OPERATION-CLOSURE-2026-08-25
- Final state: APPROVED / FINALIZE_LOCAL
- Base SHA: eeddbc2a6fa9bae6b83a7eddd1f927d6db2de2c8
- Scope: Customer Success UI reactivity and deterministic regression only.

Acceptance was to clear the old snapshot before a new operation read, reject
older request generations, keep honest loading/error states, and preserve
`getCustomerSuccessKpisV2(groupCompany || null)`.
