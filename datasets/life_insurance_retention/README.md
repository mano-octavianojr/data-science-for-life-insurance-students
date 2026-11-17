# Life insurance policy retention data guide

These synthetic records support the Harbor Life course project. The project asks which active policies the retention team should review for lapse risk, when staff could offer support, and what evidence supports that decision. All records and customer IDs are fictional.

## Coverage and contents

The dataset covers **4,000 policies, 2,000 customers, and 36 months from 1 January 2023 through 31 December 2025**. All policies were issued before the observation window and start it active. Issue dates before 2023 establish how long a policy has existed. The files begin recording payments, status events and service contacts in January 2023.

| File | One cleaned row represents | Expected unique key after cleaning | Raw rows |
|---|---|---|---:|
| [policies.csv](policies.csv) | One insurance contract | `policy_id` | 4,040 |
| [payments.csv](payments.csv) | One issued premium bill, with any recorded receipt | `policy_id` + `payment_due_date` | 94,152 |
| [events.csv](events.csv) | One dated change in coverage status | `policy_id` + `status_change_date` | 2,372 |
| [service.csv](service.csv) | One service contact and its recorded resolution, if available | `policy_id` + `contact_date` | 6,919 |

The four CSVs contain 21 columns in total, including repeated joining keys. The raw row counts include duplicate exports. Normalize and check the expected keys before joining. Each policy links through `policy_id` to zero or more rows in each history. Each synthetic `customer_id` links two policies, so losing one policy can leave a customer with active coverage on the other.

## Field-by-field dictionary

Types below describe the values after parsing. Blank cells, `NA` and `null` are missing markers. Trim surrounding whitespace first and recognize markers case-insensitively. Dates are calendar dates. Monetary amounts use **fictional currency units (FCU)**.

### policies.csv

| Field | Clean type | Meaning and valid values |
|---|---|---|
| `policy_id` | Text | Contract identifier and link to the histories. Normalize case and whitespace, preserving leading zeros. |
| `customer_id` | Text | Synthetic customer identifier. Use it to count customers and group a customer's policies. |
| `issue_date` | Date | Date the contract was issued. Use it to compute policy duration as of a specified date and the scheduled end of a ten-year contract. |
| `product_type` | Category | `term_life` provides fixed-period protection. `whole_life` is designed for lifelong coverage under its terms. `endowment` provides protection and a scheduled maturity benefit under its terms. |
| `premium` | Decimal, FCU | Contractual cost per installment. Use payment frequency to annualize scheduled premium. Some values are missing. |
| `payment_frequency` | Category | `monthly`, `quarterly` or `annual`. These represent 12, 4 or 1 scheduled installments per full year of coverage when all bills are issued. |
| `distribution_channel` | Category | How the policy was distributed, recorded as `agent`, `bank` or `direct`. Some values are missing. |
| `age_band` | Category | Age group at issue, recorded as `18-29`, `30-44`, `45-59` or `60+`. Some values are missing. |

### payments.csv

| Field | Clean type | Meaning and valid values |
|---|---|---|
| `policy_id` | Text | Contract linked to the bill. |
| `observation_month` | Date | First day of the month the installment was due. A receipt can fall in a different month. |
| `payment_due_date` | Date | Due date of the issued bill. All issued bills in the simulation are due on the first day of the month. |
| `amount_due` | Decimal, FCU | Amount requested on that bill. |
| `payment_received_date` | Date or missing | Recorded date the regular payment was received. Use the receipt only from its recorded date onward. |
| `amount_received` | Decimal, FCU | Regular payment recorded against the installment. Zero with a blank receipt date indicates no recorded regular payment. A reinstatement can settle old arrears outside this export. |

### events.csv

| Field | Clean type | Meaning and valid values |
|---|---|---|
| `policy_id` | Text | Contract affected by the event. |
| `status_change_date` | Date | Effective date of the coverage change. Reconcile conflicts with the contract rules before using this date. |
| `event_type` | Category | `lapse`, `reinstatement`, `term_expiry`, `maturity`, `cancellation`, `surrender` or `death_claim`. |

A **lapse** ends coverage for nonpayment under the simulation rules. **Reinstatement** restores coverage through a dated approval. **Term expiry** is the scheduled end of term life. **Maturity** is the scheduled completion of an endowment. **Cancellation** is a voluntary term exit in the simulation. **Surrender** is a voluntary exit from an eligible whole life or endowment contract. In this export, **death claim** dates the insured person's death that ended coverage. Claim filing, approval and payout are separate processes.

### service.csv

| Field | Clean type | Meaning and valid values |
|---|---|---|
| `policy_id` | Text | Contract associated with the contact. |
| `contact_date` | Date | When the contact was logged. |
| `service_issue_category` | Category | `payment_query`, `billing_error`, `coverage_question` or `service_delay`. |
| `resolution_date` | Date or missing | When resolution was recorded. A blank can mean the issue remains open or the resolution was omitted from the export. |

## Irregularities to investigate

Keep the raw files as your evidence. Prepare separate cleaned files or reproducible tables in your notebook. In Week 4, log each quality issue, its evidence, the affected rows, the rule applied and any effect on analysis.

| What you may see | What to check or document |
|---|---|
| Spaces around fields, lowercase policy IDs and categories with spaces or capitals | Normalize text and category codes consistently across files. Check for unmatched IDs and unknown categories after cleaning. |
| Dates such as `2024-06-01`, `2024/06/01`, `01-Jun-2024` and `June 01, 2024` | Parse the supplied formats consistently. Record parsing failures separately from values that were blank in the export. |
| Amounts with an `FCU` prefix, commas or extra spaces | Parse to numeric FCU while retaining the original value for review. Check amounts against the row's bill or receipt. |
| Repeated export rows and legitimate multiple bills, events or contacts | Remove repeated copies of a record and check the expected key. Multiple rows for one policy can reflect valid history. Investigate any remaining conflicting rows with the same key. |
| Missing `premium`, `distribution_channel` or `age_band` | Count and report missingness before selecting a treatment. A blank premium represents an unknown amount. |
| Zero received and a blank receipt date, or a month with no bill row | The first is an issued bill with no regular payment recorded. For an absent row, check the schedule, coverage and the pending-lapse rule before interpreting it. |
| Missing resolution dates | Describe the feature as **no resolution recorded as of cutoff**. Keep both explanations open: the issue may be unresolved or its resolution may be missing from the file. |
| A recorded lapse on or after a scheduled contract end | Compare the issue-date anniversary, the bill and the event history. Apply the scheduled-end rule below in a cleaned copy. Record the original and cleaned code and date, then check whether eligibility or labels change. |

Also check date order, product-specific exit codes and row counts after linkage. For example, verify that resolution follows contact and that an approved reinstatement follows a lapse. Record contradictions you cannot resolve and explain how you treat those records.

## Fictional contract and billing rules

- **Issued bills and grace.** The installment schedule follows the issue month and payment frequency. An issued bill is due on day 1. Grace runs from the next day through **due date + 30 days**, inclusive. An unpaid bill's calculated lapse date is **due date + 31 days**. Record lapse when observable and coverage has not ended under another applicable rule.
- **Skipped bills.** The simulation skips a new bill while an earlier unpaid installment is awaiting lapse, even if coverage is still active in grace. Count issued bills from the export. Establish coverage from the cleaned event history.
- **Scheduled end.** Term and endowment contracts end ten years after issue. If coverage is active immediately before that end and the end falls on or before the calculated lapse date, record `term_expiry` or `maturity` on the scheduled date in the cleaned history. Retain an earlier lapse when the policy is still lapsed at its scheduled end. Whole life has no scheduled expiry in the simulation.
- **Reinstatement.** A recorded approval restores coverage and settles prior arrears outside the installment export. At a later cutoff, exclude bills due before that approval from current overdue amounts. Check any bills due on or after approval against their receipts. Keep earlier misses and lapses in the historical record.
- **Other exits.** Cancellation, surrender, scheduled end and insured death are terminal exits in the simulation. They can compete with lapse in an outcome window. Cash-value eligibility applies to whole life and endowment. The files omit cash values, surrender payments and benefit amounts.

### Worked policy example

T001 is the fictional monthly term policy used in the slides. Its premium is **50 FCU per installment**.

| Date in 2024 | What the files and policy rules show |
|---|---|
| 1 June | The installment was issued. Its receipt date is blank and the recorded amount received is zero. |
| 30 June | Coverage is active in grace. The issued bill is 29 days overdue. |
| 1 July | Coverage is still active on the last day of grace. The export has no new bill for July. |
| 2 July | The policy lapses. This is a positive outcome for the 30 June score's July–September window. |
| 1 August | An approved reinstatement restores coverage and settles prior arrears outside the payment export. |
| 31 August | The August bill was paid on 16 August. No current bill is overdue, and the June miss and July lapse remain in history. |

## Using the data in the project

| Course stage | How to use the files |
|---|---|
| **Week 3 · Data understanding** | Confirm file contents, row units, field types, keys, observation dates and gaps. Trace one policy across the four files. |
| **Week 4 · Data quality** | Check formatting, duplicates, missingness, event order and contract conflicts. Use the cleaned event history to rebuild coverage and assign outcomes. |
| **Week 5 · Retention** | Define a starting cohort and end date. Count policy retention by contract, customer retention by customer, and scheduled-premium retention from starting installment premiums and frequencies. Document denominators and keep cash receipts separate. |
| **Week 6 · Early signals** | Measure payment and service history available at cutoff. Keep earlier misses, current overdue bills and contacts without recorded resolution as distinct measures. |
| **Weeks 7–8 · Baseline and evaluation** | Compare a current-overdue rule and a simple classifier at the same monthly review capacity. Report eligibility, exclusions, precision, recall and warning lead time. |
| **Weeks 9–10 · Recommendations** | Explain what staff could verify and how much time they have to help. A pilot measures the effect of offering support. The dataset supplies no contact permission, outreach assignments or measured intervention outcomes. |

### Preparing a scoring snapshot

1. Build **one row per active policy per scoring month-end**, keyed by `(policy_id, scoring_date)`. Apply cleaned events dated on or before the cutoff to determine coverage. Use IDs for linkage and audit and omit them from model inputs.
2. Use installments due and contacts opened by the cutoff. Count receipts, resolutions and reinstatement approvals when their dates are on or before the cutoff. Document the lookback and distinguish genuinely zero observed activity from unavailable history.
3. Summarize the histories separately before joining them to the snapshot. A direct join of 12 bills and 3 contacts for the same policy would produce 36 rows. Check that each join preserves the snapshot row count.
4. Build the target from cleaned events in the **next three calendar months**. Label **1** if lapse is observed in the window before a competing exit. Label **0** when the whole window is observed and contains neither lapse nor a competing exit. Record an exclusion if a competing exit occurs first or follow-up ends before you can establish a label.
5. Fit preprocessing and model parameters on training data, choose the approach on validation data, and assess the saved approach on later test data. Rank all scoring-eligible policies at each month-end before looking at exclusions. Freeze the top list at the agreed capacity, apply the same outcome rules to both methods, and keep the original ranks. Precision divides by evaluable selections. Recall divides by all evaluable lapses, including those outside the list.

For a six-calendar-month lookback, **30 June 2023** is the first fully supported cutoff. **30 September 2025** is the last cutoff with three complete months of follow-up. The slides use example groups of June, September and December 2023 for training, April and July 2024 for validation, and April, July and September 2025 for testing. The last training outcome window ends in March 2024 and the last validation window ends in October 2024.

## Provenance and limits

The data were generated from a fixed seed (`20261006`) for the course. The history describes a simulated portfolio. Findings support practice with data preparation, evaluation and communication. Use a separate intervention evaluation to estimate whether outreach improves retention.

The [archived validation report](validation_report.json) records row counts, missingness, CSV checksums and historical benchmark metrics. Verify the file checksums when comparing copies. Recompute any benchmark for grading using the cleaned event history, scheduled-end rule and cutoff-aware reinstatement treatment.
