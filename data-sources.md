# Team Republic: Election and candidate data sources (India / Tamil Nadu)

*Researched 19 Oct 2026 (IST). Every claim links to its source. Anything marked **[UNVERIFIED]** could not be confirmed from a primary page during this research (the page was blocked, timed out, or only reported by a third party). This is not legal advice; get a lawyer to review before any commercial launch.*

## Summary table

| # | Source | What data | Years / coverage | Format | Access method | Licence / terms | Commercial use OK? | Attribution needed | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | ECI Statistical Reports (eci.gov.in) | Official final results: candidate-wise votes, party performance, electors, turnout | LS 1951–2024; TN assembly 1967–2026 (Madras 1951–67 listed separately) | PDF + XLS/XLSX | Manual/scripted download of per-report files | No explicit open licence found. ECINET T&C say content and "database structures" are ECI property under copyright law. Copyright-policy page [UNVERIFIED] | **Unclear**: facts are public records, but there is no explicit licence. Probably low-risk for factual results; confirm | Yes (good practice; govt policies generally require source acknowledgement) | High (data), Low (terms) |
| 2 | ECI live results (results.eci.gov.in) | Counting-day trends/results | Per election (e.g. Result2021, AcResultByeNov2025 pages) | HTML | Scrape HTML pages | No terms page found on the results site | Unclear | Yes | Medium |
| 3 | Form 20 – TN CEO (elections.tn.gov.in) | Booth/polling-station-wise votes per candidate | TNLA 2021, TNLA 2026, LS 2024 (PC-wise) | PDF per AC/PC (some appear exported from XLSX) | Download from index pages | No terms found. Disclaimer: data comes from counting-centre data entry; the RO-signed version is the statutory one | Unclear (public statutory record) | Yes | High (availability), Low (terms) |
| 4 | ECI Affidavit portal (affidavit.eci.gov.in) | Nominations, candidate profile + photo, affidavit (Form 26) | Elections since 10 Mar 2019; older ones via old.eci.gov.in links | Web listings + affidavit PDF (often poorly scanned, per ADR) | Browse/filter → "View more" → download PDF | No terms found. Blocked/403 to our automated fetch | Unclear; contains personal data (see DPDP) | Yes | Medium |
| 5 | MyNeta / ADR (myneta.info, adrindia.org) | Structured affidavit data: criminal cases, assets, liabilities, education, PAN declared | TN 2016/2021/2026 assembly, LS 2024 confirmed live; EW since 2002 | HTML (no CSV); API offered to media houses | Web; API by arrangement | ADR Terms: **non-commercial only**, cite, no modification/redistribution, **no scraping without written consent** | **NO** without ADR's written consent | Yes (mandatory + send ADR publication info) | High |
| 6 | TCPD Lok Dhaba / TCPD-IED (lokdhaba.ashoka.edu.in) | Cleaned ECI results + person IDs (track careers, turncoats, incumbents), party and affidavit-derived variables | LS & assemblies 1962+; IED 1951–62 on GitHub | CSV download via "Browse Data" | Web download; GitHub | **Non-commercial** custom terms (not CC); re3data lists licence as "other" | **NO** without TCPD permission | Yes (specific data + codebook citation) | High |
| 7 | data.gov.in (OGD) | ECI LS 2024 stat-report ZIP; Statistical Hand Book "Legislature and Election" (e.g. TN assembly SHB 2020) | Varies by dataset | CSV/XLS/ZIP/API | Download / OGD API (key) | **GODL-India**: worldwide, royalty-free, commercial + non-commercial | **YES** (excludes personal info, logos, etc.) | Yes (specific attribution format + URL) | High |
| 8 | PRS Legislative Research (prsindia.org) | MP Track (attendance, debates, questions, PMBs), MLA track (some states), candidate profiles | LS/RS (e.g. 17th LS) | HTML + downloadable files | Web download | **Conflict:** Disclaimer says reuse is for **non-commercial** purposes with acknowledgement; the footer says "licensed under CC BY 4.0" | **Unclear**: get written clarification | Yes | Medium |
| 9 | Digital Sansad (sansad.in) – Lok Sabha / Rajya Sabha | Member attendance (by member/date), Questions & Answers, debates | Current + historical LS | HTML, PDF (debates on eparlib) | Web search/filters; scrape | Per search reports, eparlib copyright policy allows non-commercial/research/news use; other uses need prior permission [UNVERIFIED: page timed out] | Likely **NO** for commercial without permission [UNVERIFIED] | Yes | Low–Medium |
| 10 | TN Legislative Assembly (assembly.tn.gov.in, tnla.neva.gov.in (NeVA), tnlasdigital.tn.gov.in) | Proceedings, questions, bills, debates | 17th Assembly session from 11 May 2026 (NeVA); historical in digital repository | HTML/PDF (DSpace repository) | Web search | No terms found [UNVERIFIED] | Unclear | Yes | Low |
| 11 | TN State Election Commission (tnsec.tn.gov.in) | Local body results (rural 2019, urban 2022), candidate abstracts | RLBE 2019, ULBE 2022 | HTML/PDF [format UNVERIFIED] | Web | No terms found | Unclear | Yes | Medium |
| 12 | DataMeet maps (github.com/datameet/maps) | PC/AC boundary shapefiles/GeoJSON | PC 2019 shapefile, AC boundaries | Shapefile/GeoJSON | GitHub | Data **CC BY 4.0** (README); code MIT | **YES** | Yes (link dataset + licence) | High |
| 13 | DataMeet india-election-data (GitHub) | Pointers + scripts (e.g. affidavit downloader/mapping) | LS-focused; last pushed 2019 | Mixed | GitHub | Each dataset under its own licence; docs CC BY-SA 3.0 | Depends on underlying data | Yes | Medium |
| 14 | OpenCity (data.opencity.in) TN 2021 results | TN 2021 assembly results CSV | 2021 | CSV | CKAN download/API | Tagged "Other (Public Domain)", but reportedly credited to Lok Dhaba (non-commercial) → **licence-provenance conflict** | Treat as **NO** (inherits TCPD terms) | Yes | Medium |
| 15 | Other GitHub repos (e.g. thecont1/india-votes-data – MIT) | Scrapers/cleaned ECI data | Varies | CSV/code | GitHub | MIT for code; data still ECI-derived | Code yes; data = ECI status | Yes | Low |

---

## Per-source notes

### 1. Election Commission of India – Statistical Reports
- Index of all full statistical reports: LS 1951–2024; state assemblies (Tamil Nadu: 2026, 2021, 2016, 2011, 2006, 2001, 1996, 1991, 1989, 1984, 1980, 1977, 1971, 1967); Madras 1951–1967 listed under reorganised states; bye-election reports from 1996 to Sep–Oct 2026, plus a "Details of Bye Elections 1952–1995" Excel file. https://www.eci.gov.in/statistical-reports
- LS 2024: 42 reports, each as PDF + XLS/XLSX (e.g. "33. Constituency Wise Detailed Result", "34. Details of Assembly Segment of PC", "32. Constituency Data Summary"). https://www.eci.gov.in/general-election-to-loksabha-2024-statistical-reports
- TN Assembly 2026: 14 reports in PDF + XLSX, including "10-Detailed Results", "8-Constituency Data Summary", "13-AC Wise Candidate data Summary". https://www.eci.gov.in/statistical-report/ae/2026/26
- Older years are often PDF-only and need parsing; TCPD built Lok Dhaba by extracting these reports (see §6). Per-year XLS availability for older TN years was **[UNVERIFIED]**.
- **Terms:** eci.gov.in/terms-and-conditions covers the ECINET app. It says: "All content, including logos, UI design, and database structures, is the exclusive property of the ECI and is protected under Indian copyright laws." https://www.eci.gov.in/terms-and-conditions. We could not find or verify a separate ECI website copyright/reproduction policy: eci.gov.in returned HTTP 406 to our fetcher, and the only reference we found was secondary. **[UNVERIFIED]** For comparison, many GoI sites allow free reproduction with acknowledgement, e.g. MeitY https://www.meity.gov.in/policies/copyright-policy and PIB https://www.pib.gov.in/content/102_2_Copyright-Policy.aspx?lang=1&reg=3. These are **not** ECI's policy.
- The same ECI-sourced LS 2024 dataset is mirrored on OGD under GODL (see §7). Using that copy gives a clear commercial licence for at least LS 2024. https://up.data.gov.in/catalog/general-election-lok-sabha-2024-statistical-reports-data (seen in search results; the page returned 500 to our fetcher, **[UNVERIFIED]** details).

### 2. results.eci.gov.in (counting-day results)
- Per-election static HTML pages, e.g. https://results.eci.gov.in/Result2021/partywiseresult-S11.htm, https://results.eci.gov.in/AcResultByeNov2025/index.htm.
- No terms of use or reuse policy is shown on these pages (per search review). Treat the figures as provisional; the statistical report is the final source. Rate-limit any scraping. A path we guessed for the TN 2026 results returned 404, so URLs vary by election.

### 3. Form 20 (booth-level results) – CEO Tamil Nadu
- TNLA 2021 index (all 234 ACs, by district): https://www.elections.tn.gov.in/Form20_TNLA2021.aspx; example PDF: https://www.elections.tn.gov.in/Form20_TNLA2021/dt2/AC021.pdf
- TNLA 2026 index: https://www.elections.tn.gov.in/Form20_TNLA2026.aspx (example file https://elections.tn.gov.in/ta/Form20_TNLA2026/dt10/AC092.pdf: its title "AC092.xlsx" suggests it was exported from Excel, so it is likely text-based rather than scanned. **[UNVERIFIED]**)
- LS 2024 PC-wise Form 20: https://www.elections.tn.gov.in/GELS2024_Form20.aspx; Part II example https://elections.tn.gov.in/GELS2024_Form20_Part2/PC31.pdf
- Official disclaimer: "The data in Form 20 … is based on the data entry done at the counting centers. However, the details signed and declared by the Returning Officer have statutory validity." (same index pages)
- No terms/copyright notice was found on these pages. Earlier TN years (2016, 2019 LS) **[UNVERIFIED]**.
- elections.tn.gov.in timed out from our server, but WebFetch worked. Expect geo/IP flakiness.

### 4. ECI Affidavit portal
- Part of ENCORE. Lists nominations (Applied / Accepted / Rejected / Withdrawn / Contesting) with a candidate profile, photo and the affidavit filed with the RO, which "can be viewed and downloaded by any citizen". Launched 10 March 2019. Pre-2019 affidavits: https://old.eci.gov.in/candidate-political-parties/link-to-candidate-affidavits/. Source: https://www.eci.gov.in/affidavit-portal
- Listing pages are paginated and filterable (e.g. `CandidateCustomFilter?election=…&states=…&page=…`): https://affidavit.eci.gov.in/CandidateCustomFilter?election=9-AC-GENERAL-3-13&electionType=9-AC-GENERAL-3-13&page=141&states=S04
- Format: affidavits are PDFs of the sworn documents. ADR says they are "often poorly scanned" (https://adrindia.org/content/faqs), so OCR or manual entry is needed to get assets, liabilities and cases.
- CAPTCHA/scraping: our automated fetch got HTTP 403 and a timeout. Whether a CAPTCHA appears is **[UNVERIFIED]**. Community scrapers use headless browsers (e.g. Playwright: https://github.com/mrinshad/eci-candidate-scraper). Do **not** bypass any CAPTCHA. No terms of use were found **[UNVERIFIED]**.
- Older bulk mapping/downloader: https://github.com/datameet/india-election-data/tree/master/affidavits

### 5. MyNeta / ADR
- Coverage (live pages checked): TN 2026 (234 ACs, 3,992 candidates analysed) https://myneta.info/TamilNadu2026/; TN 2021 (3,859) https://myneta.info/TamilNadu2021/; TN 2016 https://myneta.info/tamilnadu2016/; LS 2024 (543 PCs, 8,338) https://myneta.info/LokSabha2024/. Election Watch data has run since 2002 and covers assemblies, Parliament and "a few local bodies". https://adrindia.org/content/faqs
- Download: "MyNeta doesn't provide data in CSV format but we do provide data in API format to the media houses." https://adrindia.org/content/faqs
- **Terms (blocker):** data may be used "for non-commercial purposes at no cost". Users must not "sell, rent or sub-license", "reproduce, duplicate, copy or otherwise exploit material … for a commercial purpose", "edit or otherwise modify", or "redistribute". Also: "You must not conduct any systematic or automated data collection activities (including … scraping …) without ADR's express written consent." Citation is required, and publication details must go to adr@adrindia.org. https://adrindia.org/content/adr-terms-use
- ADR's own disclaimer: in a discrepancy the ECI affidavit prevails. https://www.myneta.info/advance_search.php
- robots.txt only disallows print views (https://myneta.info/robots.txt), but the Terms of Use still prohibit scraping.
- Beware look-alikes: https://myneta.vercel.app/faq is a separate third-party site that offers CSV/JSON. Its relationship to ADR and its licence are **[UNVERIFIED]**. Do not rely on it.

### 6. TCPD Lok Dhaba / TCPD-IED (Ashoka University)
- Lok Dhaba covers Vidhan Sabha and Lok Sabha results "beginning 1962". It is built from ECI Statistical Reports, adds bypolls, and assigns each contestant a person ID to track careers, turncoats and incumbents. https://lokdhaba.ashoka.edu.in/
- 1951–62 data is on GitHub: https://github.com/tcpd/IndianElectionsDataset_1951-to-1962 (GitHub API shows no SPDX licence).
- Download: "Browse Data" → choose election type/state/years → Download Data (CSV). https://lokdhaba.ashoka.edu.in/browse-data?an=all&et=GE&seg=&st=all. Whether TN 2021/2026 is included was **[UNVERIFIED]**; one search summary suggested TN assembly years end at 2019 or 2021.
- Codebook v2.0 adds education/profession of winners from ADR and sociological variables from affidavits. https://lokdhaba.ashoka.edu.in/static/media/2022Feb12LokDhabaCodebook.21040cf7.pdf
- **Licence (blocker):** not Creative Commons. Custom terms: "free to download, display or include the data in other products for **non-commercial purposes** at no cost". Mandatory data + codebook citation; no implied endorsement; no warranty. (Codebook PDF above; GitHub README; docs https://lokdhaba.ashoka.edu.in/docs). re3data lists the licence as "other". https://www.re3data.org/repository/r3d100012639. Contact for permission: tcpd-contact@ashoka.edu.in.

### 7. data.gov.in (OGD Platform) – GODL
- GODL grants "a worldwide, royalty-free, non-exclusive license to use, adapt, publish …, translate, display, add value, and create derivative works (including products and services), for all lawful commercial and non-commercial purposes". https://odisha.data.gov.in/godl ; Gazette notification (13 Feb 2017): https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf
- Conditions: attribution of provider, source and licence with URL/DOI (or a separate attribution page when using multiple datasets); no implied endorsement; no warranty; no guarantee of updates. Exempt from the licence: personal information, sensitive data, names/crests/logos, other IP, identity documents, and data that should not have been disclosed under RTI s.8. (Same sources; also https://en.wikipedia.org/wiki/Template:GODL-India)
- Attribution template: "[Name of Data Provider], [Year], [Name of Data], [Repository], [Version/Date], [URL]. Published under [Licence]: [URL]." https://odisha.data.gov.in/godl
- Relevant datasets: "General Election to Lok Sabha 2024 – Statistical Reports Data" (ZIP) https://up.data.gov.in/catalog/general-election-lok-sabha-2024-statistical-reports-data ; "Statistical Hand Book 2020: Legislature and Election" https://www.data.gov.in/catalog/statistical-hand-book-2020-legislature-and-election ; "General Election to Tamil Nadu Legislative Assembly: SHB 2020" https://www.data.gov.in/resource/general-election-tamil-nadu-legislative-assembly-shb-2020 (exact contents **[UNVERIFIED]**: data.gov.in returned 500 to our fetcher).
- Caveat: GODL applies only to datasets published under it on OGD. It does not automatically cover everything on eci.gov.in. Personal data is excluded from GODL.

### 8. PRS Legislative Research
- MP Track methodology: attendance means signing the register (sourced from LS/RS websites); debates from Bulletin-I/proceedings; questions from the Question List; PMBs from Bulletin-I. Ministers, Speaker/Deputy Speaker and LoPs are excluded from averages. https://prsindia.org/mptrack/download?file_path=files%2Fmptrack%2FMP_Track_note.pdf ; 17th LS: https://prsindia.org/mptrack/17-lok-sabha
- **Terms conflict:** the Disclaimer says "You may choose to reproduce or redistribute the contents for non-commercial purposes in part or in full … with due acknowledgement of PRS". The same page's footer says "PRS Legislative Research is licensed under a Creative Commons Attribution 4.0 International License". https://prsindia.org/aboutus/disclaimer. Report PDFs repeat the non-commercial wording, e.g. https://prsindia.org/files/general-election-2024/General_Election_2024_Phase_2-Candidates.pdf. Get written clarification before commercial use.
- Coverage of state MLA tracking (incl. TN) was **[UNVERIFIED]**.

### 9. Parliament: Lok Sabha / Rajya Sabha (Digital Sansad)
- LS attendance by member/month/date: https://sansad.in/ls/members/attendance ; Questions & Answers with member/ministry/session filters: https://sansad.in/ls/memberPortal/questions ; Debates: https://sansad.in/ls/debates/introduction. Rajya Sabha has the equivalent at sansad.in/rs **[UNVERIFIED: specific pages not checked]**.
- Copyright: the Parliament Digital Library policy (https://eparlib.sansad.in/help/copyright-policy.jsp) reportedly allows reproduction without formal permission for non-commercial research, private study, criticism/review and news reporting with attribution, with prior permission needed otherwise. Copyright is held by the LS Secretariat. **[UNVERIFIED]**: the page timed out; this comes from a search summary.

### 10. Tamil Nadu Legislative Assembly
- Official site: https://assembly.tn.gov.in/ (contact page lists Questions sections: https://assembly.tn.gov.in/office/contact.php)
- NeVA (National e-Vidhan) portal for TNLA, showing the 17th Assembly first session (11 May–8 Sep 2026): https://tnla.neva.gov.in/
- Digital repository (DSpace) for historical proceedings/questions/bills: https://www.tnlasdigital.tn.gov.in/jspui/
- Whether member-level attendance data is published is **[UNVERIFIED]**; it is not confirmed. Terms **[UNVERIFIED]**.

### 11. Tamil Nadu State Election Commission (local bodies)
- Rural local body elections 2019 results: https://tnsec.tn.gov.in/tnsec_static/election_results/rlbe2019/rlbe2019.php
- Urban local body elections 2022 results: https://tnsec.tn.gov.in/tnsec_static/election_results/ulbe2022/ulbe2022.php ; older NIC host: https://tnsec.tn.nic.in/result/election_urban2022/index.php (per search: 1,374 corporation wards, 3,843 municipal wards and 7,621 town-panchayat wards, with Coimbatore Corporation results pending in court at the time: **[UNVERIFIED]**)
- Candidate abstracts: https://tnsec.tn.gov.in/tnsec_static/abstract_information_about_candidate/abstract_information_about_candidate_t.php
- tnsec.tn.gov.in timed out from our server. Formats and terms **[UNVERIFIED]**.

### 12. Community / other datasets
- DataMeet maps: "Unless explicitly stated, all datasets in this repository is shared under CC BY 4.0". Code is MIT. https://github.com/datameet/maps (README/LICENSE). Older project pages list CC BY-SA 2.5 India for AC/PC shapefiles (https://projects.datameet.org/maps/assembly-constituencies/), so check each file. DataMeet's site-wide default for data is ODbL (https://datameet.org/copyright/).
- DataMeet india-election-data: "Datasets are protected under their respective licenses"; docs CC BY-SA 3.0; last pushed 2019. https://github.com/datameet/india-election-data
- OpenCity TN 2021 results CSV: https://data.opencity.in/dataset/tamil-nadu-assembly-elections-2021. The CKAN licence field says "Other (Public Domain)", but a search summary says it credits Lok Dhaba, which is non-commercial. Treat it as TCPD-encumbered.
- GitHub: https://github.com/thecont1/india-votes-data (MIT; generates data from ECI-published results). Most other repos carry no licence.

---

## Legal considerations (brief, cited; not legal advice)

- **Copyright Act 1957, s.52(1)(q):** allows reproduction/publication of matter published in an Official Gazette (except Acts), and of reports of government-appointed committees/commissions that have been laid before the Legislature, unless the Government prohibits it. https://copyright.gov.in/Exceptions.aspx ; https://en.wikisource.org/wiki/The_Copyright_Act,_1957 ; https://indiankanoon.org/doc/648494/. ECI statistical reports and Form 20 do **not** clearly fall under (q). Their reuse status therefore depends on ECI/CEO policy, which is unverified, and on the general principle that raw facts are not copyrightable. That principle is **[UNVERIFIED – needs legal opinion]**. ECI's ECINET terms explicitly claim copyright in "database structures" (https://www.eci.gov.in/terms-and-conditions).
- **Third-party compilations:** ADR (https://adrindia.org/content/adr-terms-use) and TCPD (Lok Dhaba codebook) both impose non-commercial contractual terms. These bind you as conditions of use, whatever the copyright status of the underlying facts.
- **RP Act 1951 s.126A (exit polls):** conducting or disseminating exit-poll results is prohibited during the notified window; violation can mean up to 2 years' imprisonment, a fine, or both. For the 2026 assembly elections (TN included) the window was 7:00 AM 9 Apr 2026 to 6:30 PM 29 Apr 2026. https://www.pib.gov.in/PressReleasePage.aspx?PRID=2248316 ; https://indiacode.ecourtsindia.com/rp-act-1951/section/126A/
- **RP Act s.126(1)(b) silence period:** no display of election matter by TV or similar apparatus during the 48 hours ending at close of poll. ECI says this "includes display of any opinion poll" (TN 2026: 6 PM 21 Apr to 6 PM 23 Apr). Same PIB release. Whether an app counts as "similar apparatus" is **[UNVERIFIED]**. Product implication: disable any poll/prediction/sentiment features during these windows and show only official ECI figures on counting day.
- **Model Code of Conduct:** applies from announcement of the schedule (https://www.eci.gov.in/mcc). It mainly binds parties, candidates and governments. A neutral information app should avoid paid partisan content during MCC **[interpretation; UNVERIFIED]**.
- **DPDP Act 2023 s.3(c)(ii):** the Act does not apply to personal data "made or caused to be made publicly available" by the data principal or by a person under a legal obligation to publish it. https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf. Candidate affidavits are published by ECI under its legal framework, so this exemption probably covers them. Commentators stress it is narrow, and scraped or republished copies may not stay exempt: https://community.nasscom.in/communities/public-policy/publicly-accessible-personal-data-under-dpdp-act-ai-training-and-other ; https://iapp.org/news/a/scraping-public-data-in-india-innovation-enabler-or-privacy-threat-. **Recommendation:** publish only affidavit fields relevant to voters (assets, liabilities, cases, education). Do not republish addresses, phone numbers, family PAN/IDs or signatures. Keep a correction/takedown channel. Also, GODL excludes personal information (https://odisha.data.gov.in/godl), so candidate data needs separate legal footing.
- **Defamation/accuracy:** ADR and TCPD both disclaim accuracy, and ADR says the ECI affidavit prevails in any discrepancy (https://www.myneta.info/advance_search.php). Showing criminal-case data wrongly carries real risk. Link every figure to the source affidavit PDF.

---

## Recommended MVP data strategy (TN Assembly + Lok Sabha)

**Principle:** if the app may ever be commercial (ads, subscriptions, B2B), build the core only on primary government sources and GODL/CC-BY data. Treat ADR, TCPD and PRS as reference/QA sources until you have written permission.

1. **Results (core, low licence risk):**
   - TN Assembly 2026, 2021, 2016…: ECI Statistical Reports XLSX ("Detailed Results", "Constituency Data Summary") → normalise into candidates/constituencies/results tables. For older years (pre-2009, often PDF-only), parse the PDFs yourself.
   - LS 2024: use the data.gov.in GODL copy (clear commercial licence) plus the ECI XLS. Earlier LS years come from ECI reports.
   - Booth-level: TN CEO Form 20 PDFs for TNLA 2021/2026 and LS 2024 (pdftotext/camelot). Validate totals against ECI statistical reports.
   - Maps: DataMeet AC/PC boundaries (CC BY 4.0, check each file).
2. **Candidate profiles:** parse ECI affidavit PDFs yourself (ECI portal for 2019+, old.eci.gov.in links before that). Use OCR plus a manual review queue. Use MyNeta only for spot-checks, not ingestion, unless ADR grants written consent. Email adr@adrindia.org early: ADR offers an API to media houses, and a licence would save months of OCR work.
3. **Cross-election person IDs:** TCPD's person IDs are the best available but non-commercial. Either (a) ask TCPD for a commercial/partnership licence (tcpd-contact@ashoka.edu.in), or (b) build your own entity resolution (name + party + constituency + age from affidavits).
4. **Phase 2:** Digital Sansad attendance/questions for TN MPs; TN Assembly NeVA/DSpace for MLAs; PRS after clarifying its licence conflict; TNSEC local body results 2019/2022.
5. **Neutrality/compliance features:** source link and "last verified" date on every number; an automatic quiet mode for polls/predictions during s.126/126A windows; a public corrections log.

**Key risks**
- **Licence blockers:** ADR/MyNeta (non-commercial, no scraping, no modification) and TCPD/Lok Dhaba (non-commercial). Derivatives such as the OpenCity CSV may carry the same restriction. PRS is ambiguous (non-commercial disclaimer vs CC BY 4.0 footer).
- **ECI terms are unclear:** there is no explicit open licence, and ECINET terms claim copyright incl. "database structures". Get a written query/answer from ECI or the CEO TN, or a legal opinion. Prefer GODL copies on data.gov.in where they exist.
- **Data quality:** affidavits are poorly scanned; Form 20 web data is not the statutory RO-signed copy; ECI URL patterns change per election; government sites block or rate-limit automated access (we saw 403/406/timeouts).
- **Legal:** DPDP scope for republished personal data, defamation from mis-parsed criminal cases, and exit-poll/silence-period rules.
