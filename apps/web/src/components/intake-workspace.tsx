"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileCheck2,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ArrowRight,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Panel,
  PageHeader,
  Metric,
  Status,
  Drawer,
  DataGrid,
  Notice,
  Empty,
  SelectField,
} from "./shared";
import type { WorkspaceProps } from "./workspaces";
import type { Evidence, Chase, Member } from "@/lib/types";
import { api, download, label } from "@/lib/api";
import { useDraft, useUrlState, useReturnLink } from "@/hooks/workspace-state";
import { SourceDocument } from "./source-document";
import { CaseNextSteps } from "./assessment-ui";
import { toast } from "sonner";
type Validation = {
  valid: boolean;
  checks: { label: string; passed: boolean; detail: string }[];
  document: Evidence;
  requested_member_id: string;
};

export function IntakeWorkspace({
  data,
  user,
  route,
  act,
  refresh,
}: WorkspaceProps) {
  const client = useQueryClient();
  const params = useSearchParams();
  const requestedMember = params?.get("member") || "";
  const returnLink = useReturnLink();
  const [status, setStatus] = useUrlState("status", "all");
  const [provider, setProvider] = useUrlState("provider", "all");
  const [detailId, setDetailId] = useState("");
  const detail = data.chases.find((c) => c.id === detailId);
  const [nextStatus, setNextStatus] = useState("requested");
  const [note, setNote] = useDraft(`chase-${detailId}-contact`, "");
  const [channel, setChannel] = useDraft(
    `chase-${detailId}-channel`,
    "Phone follow-up",
  );
  const [busy, setBusy] = useState(false);
  const [sampleOverride, setSampleId] = useUrlState("document", "");
  const [validation, setValidation] = useState<Validation | null>(null);
  const [file, setFile] = useState<{
    name: string;
    size: number;
    type: string;
    text?: string;
    url?: string;
  } | null>(null);
  useEffect(
    () => () => {
      if (file?.url) URL.revokeObjectURL(file.url);
    },
    [file?.url],
  );
  const samples = useQuery({
    queryKey: ["intake-samples", user.id],
    queryFn: () => api<Evidence[]>("/intake/samples"),
    enabled: route === "intake",
  });
  const sampleId = sampleOverride || params?.get("sample") || (requestedMember ? samples.data?.find((d) => d.member_id === requestedMember)?.id || "" : "DOC-0010");
  const sample = samples.data?.find((d) => d.id === sampleId);
  const [memberOverride, setMemberId] = useDraft(`intake-${sampleId}-member`, "");
  const memberId =
    memberOverride || requestedMember || sample?.requested_member_id || sample?.member_id || "";
  const member = useQuery({ queryKey: ["member", memberId, user.id], queryFn: () => api<Member>(`/members/${memberId}`), enabled: route === "intake" && !!memberId });
  const rows = data.chases.filter(
    (c) =>
      (status === "all" || c.status === status) &&
      (provider === "all" || c.provider === provider),
  );
  const validate = async () => {
    setBusy(true);
    try {
      const value = await api<Validation>(
        "/intake/validate",
        {
          method: "POST",
          body: JSON.stringify({ document_id: sampleId, member_id: memberId }),
        },
        user.csrf_token,
      );
      setValidation(value);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    setBusy(true);
    try {
      const result = await api<{ message: string }>(
        "/intake/publish",
        {
          method: "POST",
          body: JSON.stringify({ document_id: sampleId, member_id: memberId }),
        },
        user.csrf_token,
      );
      toast.success(result.message);
      await refresh();
      await client.invalidateQueries({ queryKey: ["intake-samples"] });
      await client.invalidateQueries({ queryKey: ["member"] });
      setValidation(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (route === "intake") {
    const currentValidation =
      validation?.document.id === sampleId &&
      validation.requested_member_id === memberId
        ? validation
        : null;
    return (
      <>
        <PageHeader
          title="Document intake"
          description="Review source identity and eligibility before publishing."
        >{memberId && <Button variant="outline" asChild><Link href={returnLink(`/members/${memberId}?tab=Evidence%20%26%20documents&document=${sampleId}`)}>Back to {member.data?.name || memberId}<ArrowRight size={14} /></Link></Button>}</PageHeader>
        <div className="intake-workspace">
          <aside className="intake-queue" aria-label="Source documents">
            <h2>{requestedMember ? "Case documents" : "Prepared source queue"}</h2>
            {samples.data?.filter((d) => !requestedMember || d.member_id === requestedMember || d.requested_member_id === requestedMember).map((d) => (
              <button
                key={d.id}
                title={`${d.title} · ${d.id} · ${d.date} · ${d.published_at ? "Published" : label(d.source_status)}`}
                className={!file && d.id === sampleId ? "active" : ""}
                onClick={() => {
                  setSampleId(d.id);
                  setValidation(null);
                  setFile(null);
                }}
              >
                <span className="intake-queue-title">{d.title}</span>
                <small>
                  {d.id} · {d.date} · {d.published_at ? "Published" : label(d.source_status)}
                </small>
              </button>
            ))}
            {requestedMember && <Link className="intake-member-link" href="/intake">All prepared documents →</Link>}
          </aside>
          {file ? (
            <section className="source-viewer">
              <div className="source-toolbar">
                <strong>{file.name}</strong>
                <Button variant="ghost" onClick={() => setFile(null)}>
                  Close preview
                </Button>
              </div>
              <div className="source-provenance">
                Preview only — not uploaded
              </div>
              <div className="source-scroll">
                {file.url ? (
                  <iframe
                    title="Local PDF preview"
                    className="local-pdf"
                    src={file.url}
                  />
                ) : (
                  <article className="source-paper">
                    <pre className="local-preview">{file.text}</pre>
                  </article>
                )}
              </div>
            </section>
          ) : samples.isPending ? (
            <Panel>
              <Empty
                title="Loading source documents"
                description="Retrieving source pages and metadata…"
              />
            </Panel>
          ) : samples.isError ? (
            <Panel>
              <Empty
                title="Documents unavailable"
                description={samples.error.message}
              />
            </Panel>
          ) : (
            <SourceDocument
              documents={samples.data || []}
              selected={sample}
              onSelect={(id) => {
                setSampleId(id);
                setValidation(null);
              }}
            />
          )}
          <section className="intake-inspector">
            <header>{file ? "Local file preview" : "Validation"}</header>
            <div className="intake-inspector-body">
              {file ? (
                <>
                  <Notice>
                    Preview only — not uploaded. Local files are not extracted,
                    validated or published.
                  </Notice>
                  <div className="definition-list">
                    <div>
                      <span>File size</span>
                      <strong>{(file.size / 1024).toFixed(1)} KB</strong>
                    </div>
                    <div>
                      <span>Format</span>
                      <strong>{file.type || "Plain text"}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-field">
                    <Label htmlFor="intake-member">Requested member ID</Label>
                    <Input
                      id="intake-member"
                      value={memberId}
                      onChange={(e) => {
                        setMemberId(e.target.value);
                        setValidation(null);
                      }}
                    />
                  </div>
                  {sample && (
                    <div className="definition-list">
                      <div>
                        <span>Source member</span>
                        <strong>{sample.source_member_id || sample.member_id}</strong>
                      </div>
                      <div>
                        <span>Encounter date</span>
                        <strong>{sample.date}</strong>
                      </div>
                      <div>
                        <span>Practice</span>
                        <strong>{sample.provider}</strong>
                      </div>
                      <div>
                        <span>Signature</span>
                        <strong>
                          {sample.signature_status || "Not supplied"}
                        </strong>
                      </div>
                      <div>
                        <span>Source eligibility</span>
                        <Status value={sample.source_status} />
                      </div>
                    </div>
                  )}
                  {member.data?.scenario && <p className="body-copy">Scenario date {member.data.scenario.date}. Encounter dates remain as recorded; saved actions use their actual timestamps.</p>}
                  <div className="validation-checks">
                    {currentValidation ? (
                      currentValidation.checks.map((c) => (
                        <div key={c.label}>
                          <strong>{c.label}</strong>{" "}
                          <Status value={c.passed ? "passed" : "failed"} />
                          <small>{c.detail}</small>
                        </div>
                      ))
                    ) : sample?.published_at ? (
                      <p className="body-copy">Published and available for a fresh review. Previous decisions remain in the case history.</p>
                    ) : null}
                  </div>
                  {(sample?.published_at || !sample || (currentValidation && !currentValidation.valid)) && member.data && <CaseNextSteps member={member.data} user={user} accounts={data.assignment_options} />}
                </>
              )}
              <div className="local-file-preview">
                <input
                  className="sr-only"
                  id="local-file"
                  type="file"
                  accept=".pdf,.txt,text/plain,application/pdf"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    if (
                      f.type === "application/pdf" ||
                      f.name.toLowerCase().endsWith(".pdf")
                    )
                      setFile({
                        name: f.name,
                        size: f.size,
                        type: f.type,
                        url: URL.createObjectURL(f),
                      });
                    else
                      setFile({
                        name: f.name,
                        size: f.size,
                        type: f.type,
                        text: await f.text(),
                      });
                  }}
                />
                <label className="file-preview-label" htmlFor="local-file">
                  <Upload size={16} />
                  Preview file
                </label>
                <small>Preview only — not uploaded</small>
              </div>
            </div>
            {!file && (
              <footer className="decision-footer">
                <p>
                  {sample?.published_at
                    ? `Published ${new Date(sample.published_at).toLocaleString()}. Coding review and independent QA are the next gates.`
                    : currentValidation?.valid
                    ? "All required checks passed. Source will be rechecked on publish."
                    : currentValidation
                      ? "Publishing is blocked until the failed checks are resolved."
                      : "Validate the selected source to enable publishing."}
                </p>
                <Button
                  variant="outline"
                  disabled={!sample || !memberId || busy}
                  onClick={validate}
                >
                  {busy ? "Checking…" : "Validate document"}
                </Button>
                <Link
                  href={returnLink(`/members/${memberId}`)}
                  className="intake-member-link"
                >
                  Open member record →
                </Link>
                <Button
                  disabled={!currentValidation?.valid || !!sample?.published_at || busy}
                  onClick={publish}
                >
                  {sample?.published_at ? "Document published" : "Publish document"}
                </Button>
              </footer>
            )}
          </section>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="Chart chase"
        description="Coordinate retrieval, record follow-up and track usable documentation."
      >
        <Button variant="outline" asChild>
          <Link href="/intake">
            <Upload size={16} />
            Open intake
          </Link>
        </Button>
      </PageHeader>
      <div className="metric-grid three">
        <Metric
          label="Chart requests"
          value={String(data.chases.length)}
          note="Requests in your access scope"
          icon={<FileText size={18} />}
        />
        <Metric
          label="Awaiting documents"
          value={String(
            data.chases.filter((c) =>
              ["requested", "in_progress", "partially_received"].includes(
                c.status,
              ),
            ).length,
          )}
          note="Receipt is distinct from usability"
          icon={<Search size={18} />}
          accent="amber"
        />
        <Metric
          label="Usable evidence"
          value={String(
            data.chases.filter((c) => c.status === "usable").length,
          )}
          note="Validated and published sources"
          icon={<FileCheck2 size={18} />}
          accent="teal"
        />
      </div>
      <Panel>
        <DataGrid
          rows={rows}
          onRow={(c) => {
            setDetailId(c.id);
            setNextStatus(c.status);
          }}
          columns={[
            { accessorKey: "id", header: "Request" },
            { accessorKey: "member_id", header: "Member" },
            { accessorKey: "provider", header: "Practice" },
            { accessorKey: "document_type", header: "Requested document" },
            {
              accessorKey: "status",
              header: "Status",
              cell: ({ getValue }) => <Status value={String(getValue())} />,
            },
            { accessorKey: "due_date", header: "Due date" },
          ]}
          toolbar={
            <>
              <SelectField
                label="Practice"
                value={provider}
                onChange={setProvider}
                options={[
                  { value: "all", label: "All practices" },
                  ...Array.from(
                    new Set(data.chases.map((c) => c.provider)),
                  ).map((v) => ({ value: v, label: v })),
                ]}
              />
              <SelectField
                label="Chase status"
                value={status}
                onChange={setStatus}
                options={[
                  "all",
                  "requested",
                  "in_progress",
                  "partially_received",
                  "received",
                  "usable",
                  "unavailable",
                ].map((v) => ({
                  value: v,
                  label: v === "all" ? "All statuses" : label(v),
                }))}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProvider("all");
                  setStatus("all");
                }}
              >
                All practices
              </Button>
            </>
          }
          exportAction={(filtered) =>
            download(
              "chases",
              user.csrf_token,
              filtered.map((c) => c.id),
            ).catch((e) => toast.error(e.message))
          }
        />
      </Panel>
      <Drawer
        open={!!detail}
        onOpenChange={(v) => !v && setDetailId("")}
        title={detail?.id || "Chart request"}
        description={detail?.provider}
      >
        {detail && (
          <>
            <div className="badge-row">
              <Status value={detail.status} />
              <Link href={returnLink(`/members/${detail.member_id}`)}>
                {detail.member_id}
                <ArrowRight size={14} />
              </Link>
            </div>
            <p className="body-copy">{detail.document_type}</p>
            <div className="form-field">
              <Label>Retrieval state</Label>
              <SelectField
                label="Retrieval state"
                value={nextStatus}
                onChange={setNextStatus}
                options={Array.from(
                  new Set([
                    detail.status,
                    "requested",
                    "in_progress",
                    "partially_received",
                    "received",
                    "unavailable",
                  ]),
                ).map((v) => ({ value: v, label: label(v) }))}
              />
            </div>
            <Button
              disabled={busy || nextStatus === detail.status}
              onClick={async () => {
                setBusy(true);
                try {
                  await act({
                    action: "receive",
                    id: detail.id,
                    value: nextStatus,
                  });
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save retrieval state
            </Button>
            <Notice>
              Mark receipt here, then validate and publish the source in
              Document Intake.
            </Notice>
            {user.screens.includes("intake") && <Button variant="outline" asChild><Link href={`/intake?member=${detail.member_id}${detail.document_ids?.length ? `&document=${detail.document_ids[0]}` : ""}`}>Validate this member’s source<ArrowRight size={14} /></Link></Button>}
            <h3 className="section-title">Record a follow-up</h3>
            <SelectField
              label="Contact channel"
              value={channel}
              onChange={setChannel}
              options={["Phone follow-up", "Portal check", "Local note"].map(
                (v) => ({ value: v, label: v }),
              )}
            />
            <div className="form-field">
              <Label htmlFor="contact-note">Contact note</Label>
              <textarea
                id="contact-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Record the outcome and next step…"
              />
            </div>
            <Button
              variant="outline"
              disabled={!note.trim() || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await act({
                    action: "contact",
                    id: detail.id,
                    value: channel,
                    note,
                  });
                  setNote("");
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Plus size={15} />
              Save local contact note
            </Button>
            <h3 className="section-title">Contact and receipt history</h3>
            {detail.contact_history?.length ? (
              <div className="timeline">
                {detail.contact_history
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <div key={i}>
                      <strong>{h.channel}</strong>
                      <p>{h.note}</p>
                      <small>
                        {h.actor} · {new Date(h.at).toLocaleString()}
                      </small>
                    </div>
                  ))}
              </div>
            ) : (
              <Empty
                title="No follow-up recorded"
                description="Your saved notes and receipt updates appear here."
              />
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
