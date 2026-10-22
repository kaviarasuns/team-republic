export const ELECTION_ID = "tn-ae-2021";

export const LISTING_URL =
  "https://www.eci.gov.in/eci-backend/public/api/old-site-statistical-report-data?docid=13680";

export const LANDING_URL =
  "https://old.eci.gov.in/files/file/13680-tamil-nadu-general-legislative-election-2021/";

export const USER_AGENT = "TeamRepublicIngest/0.1 (+https://github.com/kaviarasus/team-republic)";

export const PUBLISHER = "Election Commission of India";

export const LICENCE_NOTE =
  "ECI statistical report. No explicit open licence found; reuse status under legal review (product-doc open question 5). See data-sources.md section 1.";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const FILE_DETAILED = "10- Detailed Results.xlsx";
export const FILE_WINNERS = "2- List of Successful Candidates.xlsx";
export const FILE_PARTIES = "3- List of Political Parties Participated.xlsx";
export const FILE_SUMMARY = "8- Constituency Data Summary.xlsx";

export const REQUIRED_FILES = [FILE_DETAILED, FILE_WINNERS, FILE_PARTIES, FILE_SUMMARY] as const;

/** Tamil Nadu has had 234 assembly constituencies since the 2008 delimitation. */
export const CONSTITUENCY_COUNT = 234;

export const STATE_NAME = "Tamil Nadu";
export const STATE_CODE = "S22";

export const titleFromFileName = (fileName: string): string => {
  const suffix = ".xlsx";
  if (!fileName.toLowerCase().endsWith(suffix)) {
    throw new Error(`Expected an .xlsx file name, got ${JSON.stringify(fileName)}`);
  }
  return fileName.slice(0, -suffix.length);
};
