# Prepared example references

Checked 12 September 2026. These references establish the limited basis of the authored examples; they do not certify real diagnosis eligibility, receiver acceptance or scoring.

## Code descriptions

[prepared-codes.json](prepared-codes.json) retains the exact descriptions for I50.22 and I50.9, the official release URL, archive SHA-256, source XML name and effective interval. The descriptions were extracted from the [CDC April 1, 2026 ICD-10-CM XML release](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2026-update/icd10cm-April-1-2026-XML.zip). The [CMS ICD-10 release page](https://www.cms.gov/medicare/coding-billing/ICD-10-codes) identifies the April–September 2026 encounter interval for this release.

- Jordan's prepared I50.22 addition is bound to the existing current assessment in DOC-0001. The user still inspects the source, records the review and obtains independent QA.
- Taylor's I50.9 is a newly authored **prior submitted code reference** used to demonstrate deletion. The original fixture described an existing heart-failure record without a specific code. This addition supplies that missing prepared reference; it does not rewrite DOC-0007 or infer a supported diagnosis from its contradictory assessment.

The reference describes codes only. No HCC mapping, general coding engine, official source-eligibility engine or financial calculation is implied.

## Scoring decision

The [CMS 2027 final announcement fact sheet](https://www.cms.gov/newsroom/fact-sheets/2027-medicare-advantage-part-d-rate-announcement) confirms continuation of the 2024 MA model. The [official 2027 model/software index](https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment/2027-model-software-icd-10-mappings) was also inspected. Availability of official software does not establish an independently checked output for this application's Casey fixture.

Casey's DOC-0008 gives broad diabetes and kidney-disease context and explicitly states that reviewed mappings and model outputs are unavailable. It does not provide the complete coding detail or an independently verified full-member reference output. This increment therefore uses the assessment's permitted **nonnumeric hierarchy illustration**: inspect baseline versus combined input sets, explain the full-member evaluation steps, and retain blank numeric totals/delta. Any segment assumption is identified as illustrative. No particular hierarchy suppression, interaction factor or revenue amount is asserted for these unspecified conditions.

Official numeric scoring and a model/year-switch calculation remain deferred. Adding numeric results later requires complete reviewed inputs, the applicable official configuration, retained expected output and an independent reproduction check.
