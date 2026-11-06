# Synthetic life insurance retention dataset

Fictional teaching data for the course project: **4,000 policies, 2,000 synthetic customers, and 36 months of observation coverage (1 January 2023–31 December 2025)**. Earlier issue dates establish policy duration; payment and service history before 2023 is not supplied. No real personal data is used. Relationships describe this simulation, not real insurance customers.

## Student files and data dictionary

| CSV | Columns | Row unit and fields |
|---|---:|---|
| `policies.csv` | 8 | One policy: `policy_id`, `customer_id`, `issue_date`, `product_type`, `premium`, `payment_frequency`, `distribution_channel`, `age_band` |
| `payments.csv` | 6 | One scheduled installment: `policy_id`, `observation_month`, `payment_due_date`, `amount_due`, `payment_received_date`, `amount_received` |
| `events.csv` | 3 | One status transition: `policy_id`, `status_change_date`, `event_type` |
| `service.csv` | 4 | One service contact: `policy_id`, `contact_date`, `service_issue_category`, `resolution_date` |

There are **21 columns across the four files**, including repeated joining keys. Raw exports include duplicate rows; their row counts exceed the distinct record counts.

- IDs are synthetic strings. Normalize whitespace and case, preserving leading zeros. `customer_id` links two policies per customer; policy and customer retention are different measures.
- Dates use unambiguous ISO, slash-separated year-first, abbreviated-month, and full-month formats. Blank, `NA`, and `null` are missing markers after trimming whitespace.
- `premium` is the contractual amount **per installment**, in fictional currency units (FCU), not an annualized premium. `amount_due` and `amount_received` use the same units; some amounts have an `FCU` prefix and thousands separators.
- Products: `term_life`, `whole_life`, `endowment`. Frequencies: `monthly`, `quarterly`, `annual`. Channels: `agent`, `bank`, `direct`. Age bands describe age at issue, not current age.
- `observation_month` is represented by the month's first day. Payments exist only for months with an installment due while the policy is active; absence of an annual or quarterly installment is not delinquency. The installment schedule follows the issue month, always on day 1.
- Event types: `lapse`, `reinstatement`, `surrender`, `cancellation`, `death_claim`, `maturity`, `term_expiry`. Service categories: `payment_query`, `billing_error`, `coverage_question`, `service_delay`.

## Cleaning exercise

Exports contain mixed date formats, uppercase and space-separated category variants, leading/trailing whitespace, lowercase policy IDs, currency-formatted numbers, approximately 1% extra exact duplicate rows, and approximately 3% missing premiums, channels, and age bands. A small proportion of otherwise populated service resolution dates is also omitted. Duplicate rows represent repeated exports, not new payments or events.

Blank receipt dates with zero received amounts represent genuinely unpaid installments. Blank resolution dates can mean unresolved service or missing documentation; students should acknowledge this uncertainty. IDs and event dates are not deliberately deleted. Do not blindly impute dates or interpret every missing value as an error. Document cleaning decisions and check the row unit before joining histories.

## Fictional contract and observation rules

All policies are active at the observation start and were issued before it. Coverage and history are fully observed through 31 December 2025; missing descriptive fields do not imply lost follow-up. Events and contacts are assumed available on their recorded dates, with no reporting delay. Payment receipt is available only on its receipt date. Use these rules explicitly when creating features.

Premiums are due on day 1. The grace period runs from the next day through **due date + 30 days inclusive**. An unpaid installment produces lapse on **due date + 31 days**, when within observation coverage. The last incomplete grace period is not automatically a lapse. This applies to all three products in this simplified simulation.

Reinstatement is a separately approved event on a later monthly boundary; assume arrears are settled as part of approval outside the regular-installment export. A receipt alone does not reinstate coverage. Regular installments resume after approval. A lapse is still a lapse outcome even if followed by reinstatement.

Term and endowment contracts end after 10 years: term expiry and endowment maturity are distinct events. Whole life has no simulated scheduled expiry. Cash-value eligibility is restricted to whole life and endowment; no cash/surrender balances or maturity/death benefit amounts are supplied. Surrender is a voluntary whole life/endowment exit; voluntary term exit is cancellation. Death claim means the coverage-ending insured death event for this simulation, not claim filing or payout timing. Terminal exits prevent later reinstatement. If an already lapsed contract reaches its scheduled end, no additional active-policy exit is recorded. There are no same-day event ties for a policy.

**T001** is the syllabus's monthly-premium term example, with installment premium 50 FCU. Its 1 June 2024 installment is unpaid; it remains active on 30 June, lapses on 2 July, and is reinstated on 1 August. Policy histories after lapse must respect the approval event. Names, beneficiaries, and benefit values are teaching context and are not dataset fields.

## Project use

1. Import and clean each file independently; check keys and duplicate extraction rows.
2. Reconstruct policy state over time and analyze lapse separately from other exits.
3. Summarize payment and service history at a chosen scoring month-end before joining to policies. Joining both raw histories directly multiplies rows.
4. For active policies, label lapse in the next three months when it precedes any competing exit. Exclude earlier competing exits and incomplete follow-up; do not label these as non-lapse. September 2025 is the latest fully observed three-month scoring cutoff.
5. Build features only from information available by the cutoff. A receipt or resolution after cutoff must not make a historical payment/contact look settled. Future events, receipt dates, and outcome fields are not predictors.
6. Split chronologically, finish development outcome windows before the next evaluation period, and fit transformations using training data only. Repeated policy/customer observations mean the exercise tests future performance on an existing portfolio.
7. Compare a simple overdue-payment baseline with a classifier. Freeze monthly top-100 policy lists before outcome exclusions; apply the same evaluability mask without refilling. Report precision/recall, prevalence, exclusions, and selected denominators. Policy-review capacity is not automatically unique-customer contact capacity.

Simulation risk is probabilistic, with overlapping payment/service patterns. Strong predictive performance is not guaranteed. Risk does not establish responsiveness to intervention, and observational findings do not prove outreach benefit.

## Hints: connect the CSVs for model training

Build a table with **one row per policy per scoring month-end**. Use `(policy_id, scoring_date)` as its unique key. A policy can appear at several scoring dates.

| Source | How to connect it | Possible training inputs |
|---|---|---|
| `policies.csv` | Start with one cleaned row per policy; repeat it for each eligible scoring date | Product, payment frequency, channel, age band, installment premium, policy duration |
| `payments.csv` | Filter history to each scoring date, summarize by policy, then join the summary | Installments due in the previous 3–6 months, unpaid installments at cutoff, maximum days overdue |
| `service.csv` | Filter contacts to each scoring date, summarize by policy, then join the summary | Recent contact count, issue-category counts, contacts with no documented resolution by cutoff |
| `events.csv` | Use events through cutoff to determine eligibility; use future events separately to construct the target | Active-policy selection and three-month lapse label; future event fields must not enter predictors |

Suggested steps:

1. **Clean before joining.** Normalize `policy_id` in all four files, parse dates and numeric amounts, harmonize categories, and remove duplicate extraction rows. Check that policy IDs are unique in the cleaned policy table and all history IDs exist there.
2. **Choose a cutoff.** For example, 30 June 2024. All policies began active; apply events up to that date in chronological order. Include policies still active or reinstated, excluding those currently lapsed or terminally exited. Derive policy duration from issue date and cutoff.
3. **Summarize payments as known then.** Include only installments due on or before cutoff. For each installment, payment is known only if its receipt date is on or before cutoff. A later receipt must be treated as not yet received. Count unpaid installments and derive days overdue from their due dates. A month without a scheduled installment is not a missed payment.
4. **Summarize service contacts as known then.** Include only contacts on or before cutoff. A resolution after cutoff is not yet known. Missing resolution documentation may be different from a genuinely unresolved issue; state how your feature handles that uncertainty.
5. **Left-join the summaries.** Join policy/payment/service summaries on `policy_id` **and `scoring_date`** when using multiple cutoffs. Each summary must have at most one row per key. Check that each join preserves the number of eligible policy snapshots. Zero can represent no observed contacts/installments; missing contract fields need separate handling.
6. **Construct the label separately.** Inspect events after cutoff through the end of the next three calendar months. For the June example, the window is 1 July–30 September 2024. Label `lapse_next_3_months = 1` if lapse occurs before any competing exit, even if reinstatement follows. Label 0 only with complete follow-up and neither lapse nor competing exit. Exclude earlier competing exits or incomplete follow-up from evaluation and report them separately.
7. **Split by time before fitting.** For example, train on June/September/December 2023 cutoffs, validate on April/July 2024, and test on April/July/September 2025. These outcome windows finish before the next split begins. Fit imputation, scaling, and encoding only on training rows. Keep policy/customer IDs and scoring dates for joins and audit, and exclude them from model predictors.
8. **Compare methods.** Start with an overdue-payment baseline and logistic regression or a shallow tree. Score every eligible policy before applying future-outcome exclusions. Freeze each top-100 list, apply the same evaluation mask without replacing excluded rows, and report precision, recall, prevalence, and selected denominators.

**Why aggregate first?** A policy with 12 payment rows and 3 service contacts produces 36 rows if both histories are directly joined on policy ID. This repeats amounts and contacts. Separate summaries produce one payment-feature row and one service-feature row per policy/cutoff.

**Trace one example:** T001 is active on 30 June 2024, with its 1 June installment unpaid and 29 days overdue. Its 2 July lapse makes its three-month target 1. Its 1 August reinstatement does not erase that lapse. July and August events help establish the outcome; they are unavailable as June predictors.

A resulting row might contain `policy_id`, `scoring_date`, product and contract features, `unpaid_installments_6m`, `max_days_overdue`, `service_contacts_6m`, and `lapse_next_3_months`. These are suggested derived features, not additional supplied CSV columns. Document your own definitions and avoid using the target or future information as an input.

## Dataset validation record

The CSVs were generated using fixed seed `20261006` and validated before release. The Python generation and solution scripts have been removed from the current repository so students develop their own workflow. The four CSVs are unchanged.

The retained `validation_report.json` records table counts, missingness, checks, model metrics, and CSV SHA-256 hashes. Checks covered cleaned source records, keys and joins, monetary/date constraints, product/event consistency, grace-period lapses, T001, retention summaries, chronological snapshots, and baseline/model evaluation. It demonstrates workflow usability, not real-world validity. Students should perform their own checks after cleaning.
