"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft, Bell, BriefcaseBusiness, Building2, Check, ChevronRight,
  CircleDollarSign, Download, FileCheck2, FilePlus2, FileText, Home,
  LayoutDashboard, Mail, MapPin, MoreHorizontal, Package, Palette,
  PenLine, Phone, Plus, ReceiptText, Search, Send, Settings2,
  ShieldCheck, Sparkles, Trash2, Upload, Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type AppView = "dashboard" | "jobs" | "customers" | "documents" | "settings" | "job";
type DocumentKind = "invoice" | "change-order";
type DocumentStatus = "Draft" | "Sent" | "Viewed" | "Signed" | "Declined" | "Superseded";

type LineItem = {
  id: string;
  category: "Service" | "Material";
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

type JobDocument = {
  id: string;
  kind: DocumentKind;
  number: string;
  title: string;
  status: DocumentStatus;
  createdAt: string;
  dueDate: string;
  serviceDate: string;
  paymentTerms: string;
  lineItems: LineItem[];
  discount: number;
  taxRate: number;
  tip: number;
  notes: string;
  signedBy?: string;
  signedAt?: string;
  parentNumber?: string;
  hasSignedPdf?: boolean;
  signedFileName?: string;
};

type Job = {
  id: string;
  number: string;
  title: string;
  customer: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  cityStateZip: string;
  status: "Active" | "Awaiting signature" | "Completed";
  progress: number;
  approvedTotal: number;
  amountDue: number;
  nextAction: string;
  documents: JobDocument[];
};

type WorkspaceSettings = {
  businessName: string;
  phone: string;
  email: string;
  completedBy: string;
  paymentTerms: string;
  taxRate: number;
  defaultNote: string;
  termsUrl: string;
  logoUrl: string;
};

type DocuSignStatus = {
  configured: boolean;
  connected: boolean;
  missing: string[];
  environment: "demo" | "production";
  redirectUri: string | null;
  connection: { accountId: string; accountName: string; expiresAt: string; connectedAt: string } | null;
};

const defaultSettings: WorkspaceSettings = {
  businessName: "Joshua’s Remodeling",
  phone: "(555) 010-1000",
  email: "billing@example.com",
  completedBy: "Joshua’s Remodeling Team",
  paymentTerms: "Upon completion",
  taxRate: 5,
  defaultNote: "Thank you for trusting Joshua’s Remodeling with your project.",
  termsUrl: "https://example.com/terms",
  logoUrl: "/joshuas-remodeling-logo.png",
};

const baseItems: LineItem[] = [
  { id: "service-1", category: "Service", name: "Sample service", description: "In this sample service, the approved remodeling work is completed as described.", quantity: 1, unitPrice: 390, taxable: true },
  { id: "material-1", category: "Material", name: "Material item", description: "Sample material", quantity: 2, unitPrice: 5, taxable: true },
];

const sampleInvoice: JobDocument = {
  id: "doc-1234", kind: "invoice", number: "INV-1234", title: "Final remodeling invoice", status: "Viewed",
  createdAt: "Aug 29, 2026", serviceDate: "Aug 29, 2026", dueDate: "Aug 29, 2026", paymentTerms: "Upon completion",
  lineItems: baseItems, discount: 20, taxRate: 5, tip: 2,
  notes: "Thank you for trusting Joshua’s Remodeling with your project.",
};

const initialJobs: Job[] = [
  {
    id: "job-12", number: "JOB-0012", title: "Kitchen & dining refresh", customer: "Demo Customer", company: "Sample Property LLC",
    email: "customer@example.com", phone: "(555) 010-1001", address: "100 Example Street", cityStateZip: "Demo City, TX 75000",
    status: "Awaiting signature", progress: 72, approvedTotal: 8401, amountDue: 401,
    nextAction: "Invoice viewed · signature pending",
    documents: [sampleInvoice, {
      id: "doc-co-01", kind: "change-order", number: "CO-0012-01", title: "Cabinet hardware upgrade", status: "Signed",
      createdAt: "Aug 21, 2026", serviceDate: "Aug 21, 2026", dueDate: "Aug 21, 2026", paymentTerms: "Added to final invoice",
      lineItems: [{ id: "co-item-1", category: "Material", name: "Brushed brass hardware upgrade", description: "Upgrade 18 cabinet pulls from standard finish.", quantity: 1, unitPrice: 400, taxable: true }],
      discount: 0, taxRate: 0, tip: 0, notes: "Adds one business day to the anticipated completion date.",
      signedBy: "Demo Customer", signedAt: "Aug 22, 2026 · 10:42 AM", parentNumber: "INV-1234",
    }],
  },
  {
    id: "job-18", number: "JOB-0018", title: "Primary bathroom renovation", customer: "Demo Customer Two", company: "—",
    email: "customer2@example.com", phone: "(555) 010-1002", address: "200 Example Avenue", cityStateZip: "Demo City, TX 75000",
    status: "Active", progress: 44, approvedTotal: 14800, amountDue: 7400, nextAction: "Rough-in inspection · Sep 2", documents: [],
  },
  {
    id: "job-09", number: "JOB-0009", title: "Rental unit flooring", customer: "Demo Customer Three", company: "Example Properties",
    email: "customer3@example.com", phone: "(555) 010-1003", address: "300 Example Road · Unit 3", cityStateZip: "Demo City, TX 75000",
    status: "Completed", progress: 100, approvedTotal: 5139, amountDue: 0, nextAction: "Paid in full · Aug 14", documents: [],
  },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function documentTotal(document: JobDocument) {
  const subtotal = document.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxable = Math.max(0, subtotal - document.discount);
  const tax = taxable * (document.taxRate / 100);
  return { subtotal, taxable, tax, total: taxable + tax + document.tip };
}

function statusTone(status: string) {
  if (status === "Signed" || status === "Completed") return "positive";
  if (status === "Viewed" || status === "Awaiting signature") return "orange";
  if (status === "Sent" || status === "Active") return "blue";
  if (status === "Declined") return "negative";
  return "neutral";
}

function StatusPill({ status }: { status: string }) {
  return <Badge className={`status-pill status-${statusTone(status)}`} variant="outline"><span className="status-dot" />{status}</Badge>;
}

function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`nav-button ${active ? "active" : ""}`}><Icon aria-hidden="true" /><span>{label}</span></button>;
}

function MetricCard({ icon: Icon, label, value, detail, accent }: { icon: typeof Home; label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={`metric-card ${accent ? "metric-accent" : ""}`}><div className="metric-label"><span className="metric-icon"><Icon /></span>{label}</div><p className="metric-value">{value}</p><p className="metric-detail">{detail}</p></article>;
}

function InvoicePreview({ document, job, settings, compact = false }: { document: JobDocument; job: Job; settings: WorkspaceSettings; compact?: boolean }) {
  const totals = documentTotal(document);
  const services = document.lineItems.filter((item) => item.category === "Service");
  const materials = document.lineItems.filter((item) => item.category === "Material");

  function renderSection(title: string, items: LineItem[]) {
    if (!items.length) return null;
    const sectionSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return <section className="invoice-section"><h4>{title}</h4><div className="invoice-table-wrap"><table className="invoice-table"><thead><tr><th>{title}</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</td><td>{item.quantity.toFixed(1)}</td><td>{money.format(item.unitPrice)}</td><td>{money.format(item.quantity * item.unitPrice)}</td></tr>)}</tbody></table></div><p className="section-subtotal">{title} subtotal: <strong>{money.format(sectionSubtotal)}</strong></p></section>;
  }

  return <article className={`invoice-paper ${compact ? "invoice-compact" : ""}`}>
    <header className="invoice-brandbar"><div className="invoice-logo"><Image src={settings.logoUrl} alt={`${settings.businessName} logo`} width={384} height={370} unoptimized /></div><div><strong>{settings.businessName.toUpperCase()}</strong><span>Built right. Documented clearly.</span></div><div className="invoice-type">{document.kind === "invoice" ? "INVOICE" : "CHANGE ORDER"}</div></header>
    <div className="invoice-body">
      <div className="invoice-intro"><div><p className="invoice-eyebrow">Prepared for</p><h3>{job.customer}</h3><p>{job.company !== "—" ? job.company : "Residential customer"}</p><p>456 State St<br />California, CA 90265</p><p className="invoice-contact"><Phone /> {job.phone}</p><p className="invoice-contact"><Mail /> {job.email}</p></div><div className="amount-panel"><span>{document.kind === "invoice" ? "Amount due" : "Change amount"}</span><strong>{money.format(totals.total)}</strong><small>{document.status === "Signed" ? "Approved and signed" : document.paymentTerms}</small></div></div>
      <div className="invoice-meta"><div><span>Job</span><strong>{job.number}</strong></div><div><span>{document.kind === "invoice" ? "Invoice" : "Change order"}</span><strong>{document.number}</strong></div><div><span>Service date</span><strong>{document.serviceDate}</strong></div><div><span>Document date</span><strong>{document.createdAt}</strong></div><div><span>Payment terms</span><strong>{document.paymentTerms}</strong></div><div><span>Due date</span><strong>{document.dueDate}</strong></div></div>
      <div className="invoice-addresses"><div><span>Service address</span><strong>{job.address}<br />{job.cityStateZip}</strong></div><div><span>Contact us</span><strong>{settings.phone}<br />{settings.email}</strong></div><div><span>Service completed by</span><strong>{settings.completedBy}</strong></div></div>
      {document.kind === "change-order" && <div className="change-callout"><FilePlus2 /><div><strong>Change to approved scope</strong><p>{document.notes || "The items below modify the original approved job scope."}</p></div></div>}
      <h3 className="invoice-heading">{document.kind === "invoice" ? "Invoice details" : "Requested changes"}</h3>
      {renderSection("Services", services)}{renderSection("Materials", materials)}
      <div className="totals-wrap"><div className="invoice-note"><span>Note</span><p>{document.notes}</p></div><div className="invoice-totals"><div><span>Subtotal</span><strong>{money.format(totals.subtotal)}</strong></div><div><span>Sample discount</span><strong>−{money.format(document.discount)}</strong></div><div><span>Tax ({document.taxRate}%)</span><strong>{money.format(totals.tax)}</strong></div>{document.tip > 0 && <div><span>Tip</span><strong>{money.format(document.tip)}</strong></div>}<div className="invoice-total"><span>{document.kind === "invoice" ? "Amount due" : "Change total"}</span><strong>{money.format(totals.total)}</strong></div></div></div>
      {document.status === "Signed" && <div className="signed-strip"><FileCheck2 /><div><span>Electronically signed by</span><strong>{document.signedBy}</strong><small>{document.signedAt}</small></div></div>}
      <footer className="invoice-footer"><span>Terms & Conditions · {settings.businessName}</span><span>Page 1 of 1</span></footer>
    </div>
  </article>;
}

function DocumentEditor({ open, onOpenChange, kind, job, settings, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; kind: DocumentKind; job: Job; settings: WorkspaceSettings; onSave: (document: JobDocument, send: boolean) => void }) {
  const [items, setItems] = useState<LineItem[]>(kind === "invoice" ? baseItems.map((item) => ({ ...item, id: `${item.id}-draft` })) : [{ id: "change-draft", category: "Service", name: "Additional work", description: "Describe the requested scope change.", quantity: 1, unitPrice: 850, taxable: true }]);
  const [discount, setDiscount] = useState(kind === "invoice" ? 20 : 0);
  const [taxRate, setTaxRate] = useState(kind === "invoice" ? settings.taxRate : 0);
  const [tip, setTip] = useState(kind === "invoice" ? 2 : 0);
  const [notes, setNotes] = useState(kind === "invoice" ? settings.defaultNote : "Explain why the change is needed and any schedule impact.");
  const [number, setNumber] = useState(kind === "invoice" ? `INV-${1234 + job.documents.length}` : `CO-${job.number.replace("JOB-", "")}-${String(job.documents.filter((d) => d.kind === "change-order").length + 1).padStart(2, "0")}`);
  const [paymentTerms, setPaymentTerms] = useState(kind === "invoice" ? settings.paymentTerms : "Added to final invoice");

  const draft: JobDocument = { id: `draft-${number}`, kind, number, title: kind === "invoice" ? "Remodeling invoice" : "Job scope adjustment", status: "Draft", createdAt: "Aug 29, 2026", serviceDate: "Aug 29, 2026", dueDate: "Aug 29, 2026", paymentTerms, lineItems: items, discount, taxRate, tip, notes, parentNumber: kind === "change-order" ? job.documents.find((d) => d.kind === "invoice")?.number : undefined };
  const total = documentTotal(draft).total;

  function updateItem(id: string, key: keyof LineItem, value: string | number | boolean) { setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item)); }
  function addItem(category: "Service" | "Material") { setItems((current) => [...current, { id: `${category}-${Date.now()}`, category, name: category === "Service" ? "New service" : "New material", description: "", quantity: 1, unitPrice: 0, taxable: true }]); }

  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="document-sheet overflow-y-auto p-0 sm:max-w-none">
    <div className="editor-topbar"><SheetHeader><SheetTitle>{kind === "invoice" ? "Create invoice" : "Create change order"}</SheetTitle><SheetDescription>{job.number} · {job.customer}</SheetDescription></SheetHeader><div className="editor-actions"><Button variant="outline" onClick={() => onSave({ ...draft, status: "Draft" }, false)}><Check /> Save draft</Button><Button className="brand-button" onClick={() => onSave({ ...draft, status: "Sent" }, true)}><Send /> Send for signature</Button></div></div>
    <div className="editor-layout"><div className="editor-form">
      <section className="form-card"><div className="section-heading"><div><span>01</span><h3>Document details</h3></div><Badge variant="outline">Draft</Badge></div><div className="form-grid two"><label>Document number<Input value={number} onChange={(event) => setNumber(event.target.value)} /></label><label>Payment terms<Select value={paymentTerms} onValueChange={setPaymentTerms}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Upon completion">Upon completion</SelectItem><SelectItem value="Net 15">Net 15</SelectItem><SelectItem value="Net 30">Net 30</SelectItem><SelectItem value="Added to final invoice">Added to final invoice</SelectItem></SelectContent></Select></label><label>Service date<Input type="date" defaultValue="2026-08-29" /></label><label>Due date<Input type="date" defaultValue="2026-08-29" /></label></div></section>
      <section className="form-card"><div className="section-heading"><div><span>02</span><h3>Line items</h3></div><Button size="sm" variant="outline" onClick={() => addItem("Service")}><Plus /> Add item</Button></div><div className="line-item-stack">{items.map((item) => <div className="line-editor" key={item.id}><div className="line-editor-main"><Select value={item.category} onValueChange={(value) => updateItem(item.id, "category", value as "Service" | "Material")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Service">Service</SelectItem><SelectItem value="Material">Material</SelectItem></SelectContent></Select><Input aria-label="Line item name" value={item.name} onChange={(event) => updateItem(item.id, "name", event.target.value)} /><Button aria-label="Remove line item" size="icon" variant="ghost" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 /></Button></div><Textarea aria-label="Line item description" value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} /><div className="line-editor-numbers"><label>Qty<Input type="number" min="0" step="0.1" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", Number(event.target.value))} /></label><label>Unit price<Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(item.id, "unitPrice", Number(event.target.value))} /></label><div><span>Amount</span><strong>{money.format(item.quantity * item.unitPrice)}</strong></div></div></div>)}<Button variant="ghost" className="add-material" onClick={() => addItem("Material")}><Package /> Add material</Button></div></section>
      <section className="form-card"><div className="section-heading"><div><span>03</span><h3>Adjustments & notes</h3></div></div><div className="form-grid three"><label>Discount<Input type="number" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label><label>Tax rate %<Input type="number" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} /></label><label>Tip<Input type="number" value={tip} onChange={(event) => setTip(Number(event.target.value))} /></label></div><label className="block-label">Customer note<Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label></section>
      <div className="mobile-total-bar"><span>Total</span><strong>{money.format(total)}</strong></div>
    </div><div className="editor-preview"><div className="preview-label"><span><Sparkles /> Live customer preview</span><span>{money.format(total)}</span></div><InvoicePreview document={draft} job={job} settings={settings} compact /></div></div>
  </SheetContent></Sheet>;
}

export default function InvoiceApp({ displayName }: { displayName: string }) {
  const [view, setView] = useState<AppView>("dashboard");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState(initialJobs[0].id);
  const [editorKind, setEditorKind] = useState<DocumentKind>("invoice");
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<JobDocument | null>(null);
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadingDocumentId, setUploadingDocumentId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [newJobDraft, setNewJobDraft] = useState({ title: "", customer: "", address: "", email: "", phone: "" });
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultSettings);
  const [docusignStatus, setDocusignStatus] = useState<DocuSignStatus | null>(null);
  const [docusignSetupOpen, setDocusignSetupOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as { workspace?: { jobs?: Job[]; settings?: WorkspaceSettings } | null };
        if (!active) return;
        if (result.workspace?.jobs?.length) {
          setJobs(result.workspace.jobs);
          setSelectedJobId(result.workspace.jobs[0].id);
          if (result.workspace.settings) setSettings({ ...defaultSettings, ...result.workspace.settings });
        } else {
          await fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobs: initialJobs, settings: defaultSettings }) });
        }
      } catch {
        // The app remains usable with its in-memory sample workspace if storage is temporarily unavailable.
      }
    }
    void loadWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    async function loadDocuSignStatus() {
      try {
        const response = await fetch("/api/docusign/status", { cache: "no-store" });
        if (response.ok) setDocusignStatus(await response.json() as DocuSignStatus);
      } catch {
        // Connection status remains unknown until the next settings visit.
      }
    }
    void loadDocuSignStatus();

    const result = new URLSearchParams(window.location.search).get("docusign");
    if (result) {
      window.history.replaceState({}, "", window.location.pathname);
      window.setTimeout(() => {
        setView("settings");
        if (result === "connected") toast.success("DocuSign account connected");
        else toast.error("DocuSign could not be connected");
        void loadDocuSignStatus();
      }, 0);
    }
  }, []);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0];
  const allDocuments = useMemo(() => jobs.flatMap((job) => job.documents.map((document) => ({ document, job }))), [jobs]);
  const filteredJobs = jobs.filter((job) => `${job.title} ${job.customer} ${job.number} ${job.address}`.toLowerCase().includes(search.toLowerCase()));
  const activeJobs = jobs.filter((job) => job.status !== "Completed").length;
  const awaiting = Math.max(1, allDocuments.filter(({ document }) => ["Sent", "Viewed"].includes(document.status)).length);
  const outstanding = jobs.reduce((sum, job) => sum + job.amountDue, 0);
  const approvedChanges = allDocuments.filter(({ document }) => document.kind === "change-order" && document.status === "Signed").reduce((sum, { document }) => sum + documentTotal(document).total, 0);

  async function persistWorkspace(nextJobs: Job[], nextSettings: WorkspaceSettings = settings) {
    try {
      const response = await fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobs: nextJobs, settings: nextSettings }) });
      if (!response.ok) throw new Error("Save failed");
    } catch {
      toast.error("This change could not be saved", { description: "Your current screen is unchanged. Please try again." });
    }
  }

  function openJob(job: Job) { setSelectedJobId(job.id); setView("job"); }
  function openEditor(kind: DocumentKind) { setEditorKind(kind); setEditorOpen(true); }
  function saveDocument(document: JobDocument, send: boolean) {
    const saved = { ...document, id: `${document.kind}-${Date.now()}` };
    const nextJobs = jobs.map((job) => job.id === selectedJob.id ? { ...job, status: (send ? "Awaiting signature" : job.status) as Job["status"], documents: [saved, ...job.documents], amountDue: document.kind === "invoice" ? documentTotal(document).total : job.amountDue } : job);
    setJobs(nextJobs);
    void persistWorkspace(nextJobs);
    setEditorOpen(false);
    toast.success(send ? "Document prepared for signature" : "Draft saved", { description: send ? "This version is now locked in the job history." : `${document.number} is ready when you are.` });
  }

  async function uploadSignedCopy(file: File, document: JobDocument) {
    setUploadingDocumentId(document.id);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("documentId", document.id);
      const response = await fetch("/api/signed-documents", { method: "POST", body: form });
      const result = await response.json() as { error?: string; filename?: string };
      if (!response.ok) throw new Error(result.error ?? "Upload failed");
      const updatedDocument: JobDocument = { ...document, status: "Signed", signedBy: document.signedBy ?? "Customer", signedAt: "Uploaded Aug 29, 2026", hasSignedPdf: true, signedFileName: result.filename ?? file.name };
      const nextJobs = jobs.map((job) => ({ ...job, documents: job.documents.map((entry) => entry.id === document.id ? updatedDocument : entry) }));
      setJobs(nextJobs);
      setPreviewDocument(updatedDocument);
      await persistWorkspace(nextJobs);
      toast.success("Signed PDF saved to this job");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signed PDF could not be saved");
    } finally {
      setUploadingDocumentId(null);
    }
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/logo", { method: "POST", body: form });
      const result = await response.json() as { error?: string; logoUrl?: string };
      if (!response.ok || !result.logoUrl) throw new Error(result.error ?? "Logo upload failed");
      const nextSettings = { ...settings, logoUrl: result.logoUrl };
      setSettings(nextSettings);
      await persistWorkspace(jobs, nextSettings);
      toast.success("Logo updated everywhere", { description: "New invoices and change orders now use this logo." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo could not be uploaded");
    } finally {
      setUploadingLogo(false);
    }
  }

  function createJob() {
    const next: Job = {
      id: `job-${Date.now()}`,
      number: `JOB-${String(20 + jobs.length).padStart(4, "0")}`,
      title: newJobDraft.title.trim() || "New remodeling job",
      customer: newJobDraft.customer.trim() || "New customer",
      company: "—",
      email: newJobDraft.email.trim() || "customer@example.com",
      phone: newJobDraft.phone.trim() || "Phone not added",
      address: newJobDraft.address.trim() || "Property address",
      cityStateZip: "",
      status: "Active",
      progress: 0,
      approvedTotal: 0,
      amountDue: 0,
      nextAction: "Add the first document",
      documents: [],
    };
    const nextJobs = [next, ...jobs];
    setJobs(nextJobs);
    setSelectedJobId(next.id);
    setNewJobDraft({ title: "", customer: "", address: "", email: "", phone: "" });
    setNewJobOpen(false);
    void persistWorkspace(nextJobs);
    toast.success("New job created");
  }

  function connectDocuSign() {
    if (docusignStatus?.configured) {
      window.location.href = "/api/docusign/connect";
      return;
    }
    setDocusignSetupOpen(true);
  }

  function JobsTable({ title = "All jobs" }: { title?: string }) {
    return <section className="content-section"><div className="section-toolbar"><div><p className="eyebrow">Work pipeline</p><h2>{title}</h2></div><Button className="brand-button" onClick={() => setNewJobOpen(true)}><Plus /> New job</Button></div><div className="search-row"><div className="search-box"><Search /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs, customers, or addresses" /></div><Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="signature">Awaiting signature</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div><div className="data-table-card"><Table><TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Customer / property</TableHead><TableHead>Status</TableHead><TableHead>Approved total</TableHead><TableHead>Next action</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader><TableBody>{filteredJobs.map((job) => <TableRow key={job.id} className="clickable-row" onClick={() => openJob(job)}><TableCell><div className="job-cell"><span>{job.number}</span><strong>{job.title}</strong><div className="mini-progress"><i style={{ width: `${job.progress}%` }} /></div></div></TableCell><TableCell><strong>{job.customer}</strong><small><MapPin /> {job.address}</small></TableCell><TableCell><StatusPill status={job.status} /></TableCell><TableCell><strong>{money.format(job.approvedTotal)}</strong>{job.amountDue > 0 && <small>{money.format(job.amountDue)} due</small>}</TableCell><TableCell><span className="next-action">{job.nextAction}</span></TableCell><TableCell><Button size="icon" variant="ghost"><ChevronRight /></Button></TableCell></TableRow>)}</TableBody></Table></div></section>;
  }

  function Dashboard() {
    return <><section className="page-intro dashboard-intro"><div><p className="eyebrow">Saturday · August 29</p><h1>Good afternoon, {displayName}.</h1><p>Here’s what needs your attention across Joshua’s Remodeling.</p></div><Button className="brand-button desktop-action" onClick={() => openEditor("invoice")}><FilePlus2 /> Create invoice</Button></section><section className="metric-grid"><MetricCard icon={BriefcaseBusiness} label="Active jobs" value={String(activeJobs)} detail="1 job due this week" /><MetricCard icon={PenLine} label="Awaiting signature" value={String(awaiting)} detail="1 viewed by customer" accent /><MetricCard icon={CircleDollarSign} label="Outstanding" value={money.format(outstanding)} detail="Across 2 open invoices" /><MetricCard icon={FileCheck2} label="Approved changes" value={money.format(approvedChanges)} detail="1 signed change order" /></section><section className="attention-card"><div className="attention-mark"><PenLine /></div><div><p className="eyebrow">Needs attention</p><h3>INV-1234 was viewed 2 hours ago</h3><p>Demo Customer opened the final invoice for {selectedJob.title}. The signature is still pending.</p></div><Button variant="outline" onClick={() => openJob(selectedJob)}>Open job <ChevronRight /></Button></section>{JobsTable({ title: "Recent jobs" })}</>;
  }

  function JobWorkspace() {
    return <><button className="back-link" onClick={() => setView("jobs")}><ArrowLeft /> Back to jobs</button><section className="job-hero"><div className="job-hero-copy"><div className="job-number-row"><span>{selectedJob.number}</span><StatusPill status={selectedJob.status} /></div><h1>{selectedJob.title}</h1><p><Users /> {selectedJob.customer} <i /> <MapPin /> {selectedJob.address}, {selectedJob.cityStateZip}</p></div><div className="job-actions"><Button variant="outline" onClick={() => openEditor("change-order")}><FilePlus2 /> Change order</Button><Button className="brand-button" onClick={() => openEditor("invoice")}><ReceiptText /> New invoice</Button></div></section><Tabs defaultValue="documents" className="job-tabs"><TabsList variant="line"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="documents">Documents <Badge variant="secondary">{selectedJob.documents.length}</Badge></TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList><TabsContent value="overview"><div className="overview-grid"><section className="detail-card"><p className="eyebrow">Job progress</p><div className="progress-head"><strong>{selectedJob.progress}%</strong><span>{selectedJob.nextAction}</span></div><div className="large-progress"><i style={{ width: `${selectedJob.progress}%` }} /></div><div className="milestone-row"><span className="done"><Check /> Approved</span><span className="done"><Check /> In progress</span><span className={selectedJob.progress === 100 ? "done" : ""}>Complete</span></div></section><section className="detail-card"><p className="eyebrow">Financial summary</p><div className="financial-line"><span>Approved job total</span><strong>{money.format(selectedJob.approvedTotal)}</strong></div><div className="financial-line"><span>Amount due</span><strong className="orange-text">{money.format(selectedJob.amountDue)}</strong></div><div className="financial-line"><span>Signed changes</span><strong>{money.format(selectedJob.documents.filter((d) => d.kind === "change-order" && d.status === "Signed").reduce((sum, d) => sum + documentTotal(d).total, 0))}</strong></div></section></div></TabsContent><TabsContent value="documents"><div className="document-workspace"><div className="document-list-card"><div className="card-heading"><div><p className="eyebrow">Job file</p><h2>Invoices & change orders</h2></div><Button variant="outline" onClick={() => openEditor("invoice")}><Plus /> Add document</Button></div>{selectedJob.documents.length ? <div className="document-list">{selectedJob.documents.map((document) => <button className="document-row" key={document.id} onClick={() => setPreviewDocument(document)}><span className={`document-icon ${document.kind}`}>{document.kind === "invoice" ? <ReceiptText /> : <FilePlus2 />}</span><span className="document-main"><small>{document.kind === "invoice" ? "Invoice" : "Change order"}</small><strong>{document.number}</strong><span>{document.title}</span></span><span className="document-date"><small>Created</small>{document.createdAt}</span><span className="document-status"><StatusPill status={document.status} />{document.signedBy && <small>by {document.signedBy}</small>}</span><span className="document-amount">{money.format(documentTotal(document).total)}<ChevronRight /></span></button>)}</div> : <div className="empty-state"><FileText /><h3>No documents yet</h3><p>Create the first invoice or change order for this job.</p><Button className="brand-button" onClick={() => openEditor("invoice")}><Plus /> Create invoice</Button></div>}</div><aside className="job-side-card"><div className="property-sketch"><Building2 /><span>Service property</span></div><h3>{selectedJob.address}</h3><p>{selectedJob.cityStateZip}</p><div className="customer-lines"><p><Users /><span><small>Customer</small>{selectedJob.customer}</span></p><p><Phone /><span><small>Phone</small>{selectedJob.phone}</span></p><p><Mail /><span><small>Email</small>{selectedJob.email}</span></p></div><Button variant="outline" className="w-full"><MoreHorizontal /> Edit job details</Button></aside></div></TabsContent><TabsContent value="activity"><section className="activity-card"><div className="timeline-item"><span className="timeline-icon orange"><PenLine /></span><div><strong>Invoice viewed by customer</strong><p>INV-1234 · Today at 11:18 AM</p></div></div><div className="timeline-item"><span className="timeline-icon green"><Check /></span><div><strong>Change order signed by Demo Customer</strong><p>CO-0012-01 · Aug 22 at 10:42 AM</p></div></div><div className="timeline-item"><span className="timeline-icon"><Send /></span><div><strong>Change order sent</strong><p>CO-0012-01 · Aug 21 at 4:08 PM</p></div></div></section></TabsContent></Tabs></>;
  }

  function DocumentsView() {
    return <section className="content-section"><div className="section-toolbar"><div><p className="eyebrow">Document center</p><h1>Invoices & change orders</h1><p>Every sent version stays attached to its job.</p></div><Button className="brand-button" onClick={() => openEditor("invoice")}><Plus /> Create invoice</Button></div><div className="document-kpis"><span><strong>{allDocuments.length}</strong> total documents</span><span><strong>{allDocuments.filter(({ document }) => document.status === "Signed").length}</strong> signed</span><span><strong>{allDocuments.filter(({ document }) => ["Sent", "Viewed"].includes(document.status)).length}</strong> awaiting action</span></div><div className="data-table-card"><Table><TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Job / customer</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader><TableBody>{allDocuments.map(({ document, job }) => <TableRow key={document.id} className="clickable-row" onClick={() => { setSelectedJobId(job.id); setPreviewDocument(document); }}><TableCell><div className="doc-table-name"><span className={`document-icon ${document.kind}`}>{document.kind === "invoice" ? <ReceiptText /> : <FilePlus2 />}</span><div><strong>{document.number}</strong><small>{document.kind === "invoice" ? "Invoice" : "Change order"}</small></div></div></TableCell><TableCell><strong>{job.number} · {job.customer}</strong><small>{job.address}</small></TableCell><TableCell>{document.createdAt}</TableCell><TableCell><StatusPill status={document.status} /></TableCell><TableCell><strong>{money.format(documentTotal(document).total)}</strong></TableCell></TableRow>)}</TableBody></Table></div></section>;
  }

  function CustomersView() {
    return <section className="content-section"><div className="section-toolbar"><div><p className="eyebrow">Customer directory</p><h1>Customers & properties</h1><p>Keep every building connected to the right customer and job.</p></div><Button className="brand-button"><Plus /> Add customer</Button></div><div className="customer-grid">{jobs.map((job) => <button key={job.id} className="customer-card" onClick={() => openJob(job)}><div className="customer-avatar">{job.customer.split(" ").map((name) => name[0]).slice(0, 2).join("")}</div><div className="customer-card-main"><h3>{job.customer}</h3><p>{job.company}</p><span><MapPin /> {job.address}, {job.cityStateZip}</span><span><Mail /> {job.email}</span></div><div className="customer-job-count"><strong>1</strong><span>job</span><ChevronRight /></div></button>)}</div></section>;
  }

  function SettingsView() {
    const updateSetting = <K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
    return <section className="content-section settings-page">
      <div className="section-toolbar"><div><p className="eyebrow">Workspace settings</p><h1>Invoice defaults</h1><p>These values appear on future documents and can be changed per job.</p></div><Button className="brand-button" onClick={async () => { await persistWorkspace(jobs, settings); toast.success("Invoice defaults saved"); }}><Check /> Save changes</Button></div>
      <div className="settings-grid"><div className="settings-stack">
        <section className="form-card settings-card"><div className="settings-icon"><Building2 /></div><div><h2>Business details</h2><p>Shown in invoice contact information.</p></div><div className="form-grid two settings-fields">
          <label>Business name<Input value={settings.businessName} onChange={(event) => updateSetting("businessName", event.target.value)} /></label>
          <label>Phone<Input value={settings.phone} onChange={(event) => updateSetting("phone", event.target.value)} /></label>
          <label>Email<Input value={settings.email} onChange={(event) => updateSetting("email", event.target.value)} /></label>
          <label>Service completed by<Input value={settings.completedBy} onChange={(event) => updateSetting("completedBy", event.target.value)} /></label>
        </div></section>
        <section className="form-card settings-card"><div className="settings-icon"><ReceiptText /></div><div><h2>Document defaults</h2><p>Applied when a new invoice or change order is created.</p></div><div className="form-grid two settings-fields">
          <label>Payment terms<Select value={settings.paymentTerms} onValueChange={(value) => updateSetting("paymentTerms", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Upon completion">Upon completion</SelectItem><SelectItem value="Net 15">Net 15</SelectItem><SelectItem value="Net 30">Net 30</SelectItem></SelectContent></Select></label>
          <label>Default tax rate<Input type="number" value={settings.taxRate} onChange={(event) => updateSetting("taxRate", Number(event.target.value))} /></label>
          <label className="span-two">Default customer note<Textarea value={settings.defaultNote} onChange={(event) => updateSetting("defaultNote", event.target.value)} /></label>
          <label className="span-two">Terms & Conditions URL<Input value={settings.termsUrl} onChange={(event) => updateSetting("termsUrl", event.target.value)} /></label>
        </div></section>
      </div><aside className="settings-aside"><section className="integration-card"><span className="integration-logo"><PenLine /></span><Badge variant="outline">{docusignStatus?.connected ? "Account connected" : docusignStatus?.configured ? "Ready to connect" : "Setup needed"}</Badge><h3>DocuSign</h3><p>{docusignStatus?.connected ? `${docusignStatus.connection?.accountName ?? "Business account"} is connected through OAuth. Envelope sending and automatic completion sync are the next activation step.` : "Connect your business account to send signature requests and automatically save completed PDFs."}</p><Button className="w-full" variant="outline" onClick={connectDocuSign}>{docusignStatus?.connected ? "Reconnect account" : "Connect DocuSign"}</Button></section><section className="brand-card"><div className="settings-icon"><Palette /></div><div><h3>Brand style</h3><p>Warm industrial</p></div><div className="brand-logo-preview"><Image src={settings.logoUrl} alt="Current company logo" width={384} height={370} unoptimized /></div><div className="color-row"><span className="swatch orange" /><span className="swatch charcoal" /><span className="swatch cream" /><span className="swatch green" /></div><label className="logo-upload-control"><Upload /><span>{uploadingLogo ? "Uploading…" : "Upload logo"}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingLogo} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); event.target.value = ""; }} /></label></section></aside></div>
    </section>;
  }

  return <div className="app-shell">
    <aside className="sidebar"><button className="brand-lockup" onClick={() => setView("dashboard")}><span className="brand-logo-frame"><Image src={settings.logoUrl} alt="Joshua’s Remodeling logo" width={384} height={370} unoptimized /></span><div><strong>JOSHUA’S</strong><small>REMODELING</small></div></button><nav aria-label="Primary navigation"><p>Workspace</p><NavButton active={view === "dashboard"} icon={LayoutDashboard} label="Overview" onClick={() => setView("dashboard")} /><NavButton active={view === "jobs" || view === "job"} icon={BriefcaseBusiness} label="Jobs" onClick={() => setView("jobs")} /><NavButton active={view === "customers"} icon={Users} label="Customers" onClick={() => setView("customers")} /><NavButton active={view === "documents"} icon={FileText} label="Documents" onClick={() => setView("documents")} /><p className="nav-secondary-label">Manage</p><NavButton active={view === "settings"} icon={Settings2} label="Invoice settings" onClick={() => setView("settings")} /></nav><div className="sidebar-footer"><div className="sidebar-avatar">JC</div><div><strong>Joshua’s Remodeling Team</strong><small>Owner</small></div><MoreHorizontal /></div></aside>
    <div className="main-shell"><header className="topbar"><button className="mobile-brand" onClick={() => setView("dashboard")}><span className="mobile-logo-frame"><Image src={settings.logoUrl} alt="Joshua’s Remodeling logo" width={384} height={370} unoptimized /></span><strong>Joshua’s</strong></button><div className="global-search"><Search /><input placeholder="Search everything…" aria-label="Search everything" /></div><div className="topbar-actions"><Badge className="mode-badge" variant="outline"><ShieldCheck /> Private workspace</Badge><Button aria-label="Notifications" size="icon" variant="ghost"><Bell /></Button><div className="top-avatar">JC</div></div></header><main className="main-content">{view === "dashboard" && Dashboard()}{view === "jobs" && JobsTable({})}{view === "job" && JobWorkspace()}{view === "documents" && DocumentsView()}{view === "customers" && CustomersView()}{view === "settings" && SettingsView()}</main></div>
    <nav className="mobile-nav" aria-label="Mobile navigation"><NavButton active={view === "dashboard"} icon={LayoutDashboard} label="Overview" onClick={() => setView("dashboard")} /><NavButton active={view === "jobs" || view === "job"} icon={BriefcaseBusiness} label="Jobs" onClick={() => setView("jobs")} /><button className="mobile-create" onClick={() => openEditor("invoice")}><Plus /><span>New</span></button><NavButton active={view === "documents"} icon={FileText} label="Docs" onClick={() => setView("documents")} /><NavButton active={view === "settings"} icon={Settings2} label="Settings" onClick={() => setView("settings")} /></nav>
    {selectedJob && <DocumentEditor key={`${editorKind}-${selectedJob.id}-${editorOpen}`} open={editorOpen} onOpenChange={setEditorOpen} kind={editorKind} job={selectedJob} settings={settings} onSave={saveDocument} />}
    <Dialog open={Boolean(previewDocument)} onOpenChange={(open) => !open && setPreviewDocument(null)}>
      <DialogContent className="preview-dialog max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="preview-dialog-header">
          <div><DialogTitle>{previewDocument?.number}</DialogTitle><DialogDescription>{previewDocument?.kind === "invoice" ? "Customer invoice" : "Customer change order"} · immutable version</DialogDescription></div>
          <div className="preview-dialog-actions">
            <Button variant="outline" onClick={() => window.print()}><Download /> Download PDF</Button>
            {previewDocument?.hasSignedPdf && <Button variant="outline" onClick={() => { window.location.href = `/api/signed-documents?documentId=${encodeURIComponent(previewDocument.id)}`; }}><FileCheck2 /> Signed copy</Button>}
            {previewDocument && !previewDocument.hasSignedPdf && <label className="upload-signed-button"><Upload /><span>{uploadingDocumentId === previewDocument.id ? "Uploading…" : "Upload signed PDF"}</span><input type="file" accept="application/pdf" disabled={uploadingDocumentId === previewDocument.id} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSignedCopy(file, previewDocument); }} /></label>}
            {previewDocument && !["Signed", "Declined"].includes(previewDocument.status) && <Button className="brand-button" onClick={() => toast.info("Connect DocuSign in Settings to send this live.")}><Send /> Send reminder</Button>}
          </div>
        </DialogHeader>
        {previewDocument && <InvoicePreview document={previewDocument} job={selectedJob} settings={settings} />}
      </DialogContent>
    </Dialog>
    <Dialog open={newJobOpen} onOpenChange={setNewJobOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a new job</DialogTitle><DialogDescription>Connect the customer, property, and documents in one workspace.</DialogDescription></DialogHeader>
        <div className="form-grid two modal-fields">
          <label>Job title<Input value={newJobDraft.title} onChange={(event) => setNewJobDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Kitchen remodel" /></label>
          <label>Customer name<Input value={newJobDraft.customer} onChange={(event) => setNewJobDraft((draft) => ({ ...draft, customer: event.target.value }))} placeholder="Customer name" /></label>
          <label className="span-two">Service address<Input value={newJobDraft.address} onChange={(event) => setNewJobDraft((draft) => ({ ...draft, address: event.target.value }))} placeholder="100 Example Street, Dallas, TX 75201" /></label>
          <label>Email<Input value={newJobDraft.email} onChange={(event) => setNewJobDraft((draft) => ({ ...draft, email: event.target.value }))} type="email" placeholder="customer@example.com" /></label>
          <label>Phone<Input value={newJobDraft.phone} onChange={(event) => setNewJobDraft((draft) => ({ ...draft, phone: event.target.value }))} placeholder="(555) 555-5555" /></label>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setNewJobOpen(false)}>Cancel</Button><Button className="brand-button" onClick={createJob}>Create job</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={docusignSetupOpen} onOpenChange={setDocusignSetupOpen}>
      <DialogContent className="docusign-setup-dialog sm:max-w-xl">
        <DialogHeader><DialogTitle>Finish DocuSign connection</DialogTitle><DialogDescription>The app-side OAuth connection is ready. DocuSign still needs a developer application and secure credentials.</DialogDescription></DialogHeader>
        <div className="setup-steps">
          <div><span>1</span><p><strong>Create a DocuSign developer app</strong><small>Use an Integration Key with Authorization Code Grant.</small></p></div>
          <div><span>2</span><p><strong>Add the exact redirect URI</strong><code>https://joshuas-remodeling.joshuareyes09876.chatgpt.site/api/docusign/callback</code></p></div>
          <div><span>3</span><p><strong>Add credentials securely</strong><small>Integration Key, client secret, and a token-encryption key must be stored as protected app settings.</small></p></div>
          <div><span>4</span><p><strong>Connect and test in Demo</strong><small>Then we will enable envelope sending, completion webhooks, and automatic signed-PDF retrieval.</small></p></div>
        </div>
        {docusignStatus?.missing?.length ? <p className="setup-missing">Still needed: {docusignStatus.missing.join(", ")}.</p> : null}
        <DialogFooter><Button variant="outline" onClick={() => setDocusignSetupOpen(false)}>Close</Button><Button className="brand-button" asChild><a href="https://developers.docusign.com/platform/auth/public-authcode-get-token/" target="_blank" rel="noreferrer">Open DocuSign guide</a></Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Toaster richColors position="top-right" />
  </div>;
}
