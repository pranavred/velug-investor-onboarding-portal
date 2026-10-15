import type { CategoryId, Requirement, SampleDocument, Scenario, ScenarioId, SourceField, SourceSection } from "./types.ts";

export const categories: { id: CategoryId; label: string; short: string }[] = [
  { id: "entity", label: "Entity documents", short: "Entity" },
  { id: "identity", label: "Identity & address", short: "Identity" },
  { id: "ownership", label: "Ownership & authority", short: "Ownership" },
  { id: "tax", label: "Tax certifications", short: "Tax" },
  { id: "subscription", label: "Subscription & eligibility", short: "Subscription" },
  { id: "bank", label: "Bank evidence", short: "Banking" },
];

const fund = "Asteria Private Credit Fund I";
const field = (key: string, label: string, value: string): SourceField => ({ key, label, value });
const section = (id: string, title: string, fields: SourceField[], note?: string): SourceSection => ({ id, title, fields, note });
const commonRequirements: Requirement[] = [
  { id: "identity", title: "Signatory identity", reason: "Identify the person signing the application." },
  { id: "address", title: "Address evidence", reason: "Compare the declared address with supporting evidence." },
  { id: "tax", title: "Tax certification", reason: "Record declared tax status for a separate tax review." },
  { id: "subscription", title: "Subscription agreement", reason: "Capture the investment amount and qualification declarations." },
  { id: "bank", title: "Bank account evidence", reason: "Compare the account holder with the legal investor." },
];
const companyRequirements: Requirement[] = [
  { id: "formation", title: "Formation certificate", reason: "Establish the legal subscribing entity." },
  { id: "ownership", title: "Ownership statement", reason: "Identify the declared owners and any missing interests." },
  { id: "authority", title: "Signing authority", reason: "Show that the signatory may act for this company." },
  ...commonRequirements,
];

function companyDocs(prefix: "company" | "complex", name: string, complex: boolean): SampleDocument[] {
  const signer = complex ? "Jordan Avery" : "Morgan Ellis";
  const address = complex ? "42 Example Lane, Boston, MA 00000" : "100 Sample Avenue, New York, NY 00000";
  const doc = (suffix: string, title: string, filename: string, category: CategoryId, sourceFolder: string, requirements: string[], sections: SourceSection[], extra: Partial<SampleDocument> = {}): SampleDocument => ({ id: `${prefix}-${suffix}`, logicalId: `${prefix}-${suffix}`, scenarioId: prefix, title, filename, category, sourceFolder, version: 1, requirements, sections, ...extra });
  const bankSections = (holder: string) => [section("bank", "Account summary", [field("account-holder", "Account holder", holder), field("bank-name", "Financial institution", "Example Bank (fictional)"), field("account-suffix", "Account reference", "SAMPLE-XXXX-4821"), field("bank-currency", "Account currency", "USD"), field("statement-date", "Statement date", "September 30, 2026")], "This fictional statement is evidence for account-holder comparison only. It does not establish account control or receipt of funds.")];
  return [
    doc("formation", "Certificate of formation", "01_Certificate_of_Formation.pdf", "entity", "Company records", ["formation"], [section("entity", "Entity particulars", [field("legal-name", "Legal entity name", name), field("legal-form", "Legal form", "Limited liability company"), field("formation-jurisdiction", "Formation jurisdiction", "Delaware, United States"), field("registered-address", "Registered address", address), field("registry-reference", "Formation reference", `SAMPLE-${prefix === "company" ? "OBH" : "RWH"}-2026`), field("formation-date", "Formation date", "January 15, 2021")])]),
    doc("ownership", "Ownership statement", "02_Ownership_Statement.pdf", "ownership", "Company records", ["ownership"], [section("ownership", "Declared ownership", complex ? [field("owner-1", "Direct owner", "Northstar Holding Ltd (fictional)"), field("owner-1-interest", "Direct equity interest", "60%"), field("owner-2", "Second direct owner", "Jordan Avery"), field("owner-2-interest", "Second direct equity interest", "40%"), field("intermediate-owner", "Owner of Northstar Holding Ltd", "Cameron Blake"), field("intermediate-interest", "Interest in intermediate entity", "Unknown")] : [field("owner-1", "First owner", "Morgan Ellis"), field("owner-1-interest", "First direct equity interest", "60%"), field("owner-2", "Second owner", "Taylor Reed"), field("owner-2-interest", "Second direct equity interest", "40%")], complex ? "The supplied statement identifies an intermediate owner but leaves their ownership percentage blank. No indirect interest can be established from this evidence." : "The interests above are declared direct economic interests. They do not by themselves establish an AML or sanctions conclusion.")]),
    doc("authority", "Manager signing resolution", "03_Signing_Resolution.pdf", "ownership", "People & authority", ["authority"], [section("authority", "Authority to execute", [field("authorised-party", "Represented entity", name), field("signatory", "Authorised signatory", signer), field("signing-capacity", "Signing capacity", "Manager"), field("authority-scope", "Authority scope", "Execute the Asteria subscription documents"), field("resolution-date", "Resolution date", "September 22, 2026")], "Fictional resolution for demonstration. Authority assessment remains a reviewer responsibility.")]),
    doc("identity", "Sample identity evidence", "04_Signatory_Identity.pdf", "identity", "People & authority", ["identity"], [section("identity", "Personal details", [field("identity-name", "Name on evidence", signer), field("identity-reference", "Evidence reference", "NOT-A-VALID-ID-2026"), field("identity-expiry", "Illustrative expiry", "December 31, 2030")], "This is a fictional identity-evidence worksheet, not an official identity document. No authenticity or liveness verification has been performed.")]),
    doc("address", "Address evidence", "05_Address_Evidence.pdf", "identity", "People & authority", ["address"], [section("address", "Correspondence address", [field("address-subject", "Named party", signer), field("residential-address", "Address on evidence", address), field("address-issued", "Evidence date", "September 20, 2026")], "Fictional correspondence showing an address for comparison.")]),
    doc("tax", "Illustrative tax certification", "06_Tax_Certification.pdf", "tax", "Tax & investment", ["tax"], [section("tax", "Declared tax particulars", [field("tax-form", "Candidate form route", "W-9 (illustrative)"), field("tax-owner", "Declared tax owner", name), field("tax-classification", "Declared US tax classification", "C corporation"), field("tax-residence", "Declared tax residence", "United States"), field("tax-identifier", "Synthetic tax reference", "INVALID-SAMPLE-TIN"), field("tax-signed", "Certification date", "September 23, 2026")], "This worksheet is not an IRS form and is not valid for tax use. Tax classification is explicitly declared here; it is not inferred from the LLC legal form. Specialist review is pending.")]),
    doc("subscription", "Subscription agreement", "07_Subscription_Agreement.pdf", "subscription", "Tax & investment", ["subscription"], [section("investment", "Subscription particulars", [field("subscribing-party", "Legal subscriber", name), field("fund-name", "Fund", fund), field("share-class", "Share class", "Class A"), field("commitment", "Requested commitment", complex ? "$2,500,000" : "$1,000,000"), field("currency", "Currency", "USD"), field("qualification", "Declared qualification", "Accredited investor (self-declared)"), field("execution", "Document execution", "Illustrative signed sample"), field("execution-date", "Sample execution date", "September 25, 2026")], "All fund and investor names are fictional. Qualification declarations require offering-specific assessment; the illustrative execution is not a valid electronic signature or fund acceptance.")]),
    doc("bank", "Bank account statement", "08_Bank_Statement.pdf", "bank", "Banking", ["bank"], bankSections(complex ? name : "Oakbridge Management LLC")),
    ...(!complex ? [doc("bank-corrected", "Corrected bank account statement", "09_Corrected_Bank_Statement.pdf", "bank", "Requested corrections", ["bank"], bankSections(name), { logicalId: "company-bank", version: 2, correction: true })] : []),
  ];
}

const individualName = "Alex Chen";
const individualDocument = (suffix: string, title: string, category: CategoryId, sourceFolder: string, sections: SourceSection[]): SampleDocument => ({ id: `individual-${suffix}`, logicalId: `individual-${suffix}`, scenarioId: "individual", filename: `${title.replaceAll(" ", "_")}.pdf`, title, category, sourceFolder, version: 1, requirements: [suffix], sections });

export const scenarios: Scenario[] = [
  { id: "company", label: "Company subscription", description: "A company package with a bank-name discrepancy to resolve.", legalName: "Oakbridge Holdings LLC", investorType: "US company", initials: "OH", preparer: "Morgan Ellis", commitment: "$1,000,000", fund, shareClass: "Class A", close: "October 30, 2026", requirements: companyRequirements, documents: companyDocs("company", "Oakbridge Holdings LLC", false) },
  { id: "individual", label: "Individual investor", description: "A simpler checklist for a person investing in their own name.", legalName: individualName, investorType: "Individual", initials: "AC", preparer: individualName, commitment: "$250,000", fund, shareClass: "Class A", close: "October 30, 2026", requirements: commonRequirements.map((r) => r.id === "identity" ? { ...r, title: "Investor identity" } : r), documents: [
    individualDocument("identity", "Sample Identity Evidence", "identity", "Personal records", [section("identity", "Personal details", [field("identity-name", "Name on evidence", individualName), field("identity-reference", "Evidence reference", "NOT-A-VALID-ID-2026"), field("identity-expiry", "Illustrative expiry", "December 31, 2030")], "Fictional worksheet; no identity authenticity or liveness verification has been performed.")]),
    individualDocument("address", "Address Evidence", "identity", "Personal records", [section("address", "Correspondence details", [field("address-subject", "Named party", individualName), field("residential-address", "Address on evidence", "18 Example Street, New York, NY 00000"), field("address-issued", "Evidence date", "September 20, 2026")])]),
    individualDocument("tax", "Tax Certification", "tax", "Tax & investment", [section("tax", "Declared tax particulars", [field("tax-form", "Candidate form route", "W-9 (illustrative)"), field("tax-owner", "Declared tax owner", individualName), field("tax-classification", "Declared US tax status", "US tax person"), field("tax-residence", "Declared tax residence", "United States"), field("tax-identifier", "Synthetic tax reference", "INVALID-SAMPLE-TIN"), field("tax-signed", "Certification date", "September 23, 2026")], "This is not an IRS form. Declared tax status requires separate review.")]),
    individualDocument("subscription", "Subscription Agreement", "subscription", "Tax & investment", [section("investment", "Subscription particulars", [field("subscribing-party", "Legal subscriber", individualName), field("fund-name", "Fund", fund), field("share-class", "Share class", "Class A"), field("commitment", "Requested commitment", "$250,000"), field("currency", "Currency", "USD"), field("qualification", "Declared qualification", "Accredited investor (self-declared)"), field("execution", "Document execution", "Illustrative signed sample")], "Fictional execution and qualification declarations; no valid signature or admission.")]),
    individualDocument("bank", "Bank Account Statement", "bank", "Banking", [section("bank", "Account summary", [field("account-holder", "Account holder", individualName), field("bank-name", "Financial institution", "Example Bank (fictional)"), field("account-suffix", "Account reference", "SAMPLE-XXXX-7190"), field("bank-currency", "Account currency", "USD"), field("statement-date", "Statement date", "September 30, 2026")], "A name match does not establish account control or receipt of money.")]),
  ] },
  { id: "complex", label: "Layered ownership", description: "An intermediate owner is disclosed, but their interest is unknown.", legalName: "Redwood Holdings LLC", investorType: "Company with layered ownership", initials: "RH", preparer: "Jordan Avery", commitment: "$2,500,000", fund, shareClass: "Class A", close: "October 30, 2026", requirements: companyRequirements, documents: companyDocs("complex", "Redwood Holdings LLC", true) },
];

export function getScenario(id: ScenarioId): Scenario {
  return scenarios.find((s) => s.id === id) ?? scenarios[0];
}
export function documentUrl(document: SampleDocument): string {
  return `/investor-onboarding/documents/${document.id}.pdf`;
}
