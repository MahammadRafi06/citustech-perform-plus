"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Layers3,
  LoaderCircle,
  Plus,
  Users,
  ArrowRight,
  ArrowDownToLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Panel,
  PageHeader,
  Metric,
  Status,
  Modal,
  Drawer,
  DataGrid,
  Notice,
  SelectField,
} from "./shared";
import { useDraft, useUrlState, useReturnLink } from "@/hooks/workspace-state";
import type { WorkspaceProps } from "./workspaces";
import type { Snapshot, Command, User, Opportunity } from "@/lib/types";
import { api, download, label } from "@/lib/api";
import { toast } from "sonner";

type Preview = {
  versions: Record<string, number>;
  covered: string[];
  ids: string[];
  at: string;
  name: string;
  owner: string;
  due: string;
  intervention: string;
};
type CampaignDraft = {
  name: string;
  owner: string;
  due: string;
  intervention: string;
  selected: string[];
  excluded: string[];
  provider: string;
  priority: string;
  step: number;
  preview: Preview | null;
};
const freshDraft: CampaignDraft = {
  name: "",
  owner: "Coding team",
  due: "2026-09-30",
  intervention: "Retrospective review",
  selected: [],
  excluded: [],
  provider: "all",
  priority: "all",
  step: 1,
  preview: null,
};
function draftKey(userId: string) {
  return `ct-campaign-${userId}`;
}
export function CampaignDialog({
  open,
  onOpenChange,
  selected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  data: Snapshot;
  act: (c: Command) => Promise<unknown>;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const client = useQueryClient();
  useEffect(() => {
    if (!open) return;
    const user = client.getQueryData<User>(["session"]);
    if (!user) return;
    let previous = freshDraft;
    try {
      const saved = sessionStorage.getItem(draftKey(user.id));
      if (saved) previous = JSON.parse(saved);
    } catch {}
    sessionStorage.setItem(
      draftKey(user.id),
      JSON.stringify({
        ...previous,
        selected: selected.length ? selected : previous.selected,
        excluded: selected.length ? [] : previous.excluded,
        step: 1,
        preview: null,
      }),
    );
    onOpenChange(false);
    router.push("/campaigns/new");
  }, [open]);
  return null;
}
export function CampaignPlanner(props: WorkspaceProps) {
  return props.path.split("/")[2] === "new" ? (
    <CampaignWorkflow {...props} />
  ) : (
    <CampaignList {...props} />
  );
}
function CampaignWorkflow({ data, user, act }: WorkspaceProps) {
  const router = useRouter();
  const client = useQueryClient();
  const [draft, setDraft] = useState<CampaignDraft>(freshDraft);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState("");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey(user.id));
      if (saved) setDraft({ ...freshDraft, ...JSON.parse(saved) });
    } catch {}
    setReady(true);
  }, [user.id]);
  useEffect(() => {
    if (ready) sessionStorage.setItem(draftKey(user.id), JSON.stringify(draft));
  }, [draft, ready, user.id]);
  const update = (values: Partial<CampaignDraft>) => {
    setDraft((d) => ({ ...d, ...values, preview: null }));
    setStale("");
  };
  const pool = data.opportunities;
  const rows = pool.filter(
    (o) =>
      (draft.provider === "all" || o.provider === draft.provider) &&
      (draft.priority === "all" || o.priority === draft.priority),
  );
  const covered = new Set(
    data.campaigns
      .filter((c) => c.status === "active")
      .flatMap((c) => c.member_ids),
  );
  const ids = draft.selected.filter((id) => !draft.excluded.includes(id));
  const cohort = pool.filter((o) => ids.includes(o.member_id));
  const freeze = async () => {
    setBusy(true);
    try {
      const latest = await api<Snapshot>("/bootstrap");
      const current = latest.opportunities.filter((o) =>
        ids.includes(o.member_id),
      );
      if (current.length !== ids.length)
        throw Error(
          "One or more selected members are no longer in the review work population. Update your cohort.",
        );
      const preview: Preview = {
        versions: Object.fromEntries(current.map((o) => [o.id, o.version])),
        covered: ids
          .filter((id) =>
            latest.campaigns.some(
              (c) => c.status === "active" && c.member_ids.includes(id),
            ),
          )
          .sort(),
        ids: [...ids],
        at: new Date().toISOString(),
        name: draft.name,
        owner: draft.owner,
        due: draft.due,
        intervention: draft.intervention,
      };
      setDraft((d) => ({ ...d, step: 4, preview }));
      setStale("");
    } catch (e) {
      setStale((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const activate = async () => {
    if (!draft.preview) return;
    setBusy(true);
    const p = draft.preview;
    try {
      await act({
        action: "campaign",
        name: p.name,
        owner: p.owner,
        due_date: p.due,
        value: p.intervention,
        member_ids: p.ids,
        expected_versions: p.versions,
        expected_covered: p.covered,
      });
      sessionStorage.removeItem(draftKey(user.id));
      client.setQueryData(["draft", user.id, "registry-suspects-selected"], []);
      client.setQueryData(["draft", user.id, "planner-cohort"], []);
      router.push("/campaigns");
    } catch (e) {
      setStale((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!ready) return <Notice>Restoring your campaign draft…</Notice>;
  return (
    <div className="campaign-workflow">
      <PageHeader
        title="Create campaign"
        description="Build a precise cohort and review the allocation before activation."
      >
        <Button
          variant="outline"
          onClick={() => {
            sessionStorage.setItem(draftKey(user.id), JSON.stringify(draft));
            toast.success("Draft saved on this device");
          }}
        >
          Save draft
        </Button>
      </PageHeader>
      <nav className="wizard-steps" aria-label="Campaign stages">
        {[
          "Define cohort",
          "Select intervention",
          "Allocate work",
          "Review and activate",
        ].map((title, i) => (
          <span
            className={draft.step === i + 1 ? "active" : ""}
            key={title}
            aria-current={draft.step === i + 1 ? "step" : undefined}
          >
            <b>{i + 1}</b>
            {title}
          </span>
        ))}
      </nav>
      {draft.step === 1 ? (
        <>
          <div className="cohort-stats">
            <span>
              <strong>{rows.length}</strong> match criteria
            </span>
            <span>
              <strong>{draft.selected.length}</strong> selected
            </span>
            <span>
              <strong>
                {
                  draft.selected.filter(
                    (id) => !rows.some((o) => o.member_id === id),
                  ).length
                }
              </strong>{" "}
              outside current filters
            </span>
            <span>
              <strong>{draft.excluded.length}</strong> explicitly excluded
            </span>
            <span>
              <strong>{ids.filter((id) => covered.has(id)).length}</strong>{" "}
              already covered
            </span>
          </div>
          <Panel
            title="Review work population"
            subtitle={`${pool.length} available members. Select explicit records; filtering does not change your selection.`}
          >
            <DataGrid
              stateKey="cohort"
              rows={rows}
              pageSize={25}
              selectedIds={pool
                .filter((o) => draft.selected.includes(o.member_id))
                .map((o) => o.id)}
              searchLabel="Search cohort members…"
              toolbar={
                <>
                  <SelectField
                    label="Practice"
                    value={draft.provider}
                    onChange={(provider) => update({ provider })}
                    options={[
                      { value: "all", label: "All practices" },
                      ...Array.from(new Set(pool.map((o) => o.provider || "")))
                        .filter(Boolean)
                        .map((v) => ({ value: v, label: v })),
                    ]}
                  />
                  <SelectField
                    label="Priority"
                    value={draft.priority}
                    onChange={(priority) => update({ priority })}
                    options={["all", "High", "Medium", "Low"].map((v) => ({
                      value: v,
                      label: v === "all" ? "All priorities" : v,
                    }))}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => update({ selected: [], excluded: [] })}
                  >
                    Clear selection
                  </Button>
                </>
              }
              columns={[
                {
                  id: "select",
                  header: "Select",
                  enableSorting: false,
                  cell: ({ row }) => (
                    <Checkbox
                      aria-label={`Include ${row.original.name || row.original.member_id}`}
                      checked={draft.selected.includes(row.original.member_id)}
                      onCheckedChange={(v) =>
                        update({
                          selected: v
                            ? Array.from(
                                new Set([
                                  ...draft.selected,
                                  row.original.member_id,
                                ]),
                              )
                            : draft.selected.filter(
                                (id) => id !== row.original.member_id,
                              ),
                        })
                      }
                    />
                  ),
                },
                {
                  accessorKey: "name",
                  header: "Member",
                  cell: ({ row }) => (
                    <>
                      <strong>{row.original.name}</strong>
                      <small>{row.original.member_id}</small>
                    </>
                  ),
                },
                { accessorKey: "condition", header: "Finding" },
                { accessorKey: "priority", header: "Priority" },
                {
                  accessorKey: "status",
                  header: "Status",
                  cell: ({ getValue }) => <Status value={String(getValue())} />,
                },
                {
                  id: "coverage",
                  header: "Campaign coverage",
                  cell: ({ row }) =>
                    covered.has(row.original.member_id)
                      ? "Already covered"
                      : "No active allocation",
                },
              ]}
            />
          </Panel>
          <p className="body-copy">
            Select 1–500 members. Existing campaign coverage is shown for review
            and does not silently exclude members.
          </p>
        </>
      ) : draft.step === 2 ? (
        <Panel
          title="Choose an intervention"
          subtitle="One work type will be applied to the explicit cohort."
        >
          <div className="padded workflow-form intervention-options">
            {[
              [
                "Retrospective review",
                "Inspect current documentation and record a coding decision.",
              ],
              [
                "Pre-visit assessment",
                "Request a current assessment ahead of the encounter.",
              ],
              ["Chart retrieval", "Obtain missing source documentation."],
              ["Independent QA", "Allocate a separate quality review."],
            ].map(([value, description]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="intervention"
                  checked={draft.intervention === value}
                  onChange={() => update({ intervention: value })}
                />
                <span>
                  <strong>{value}</strong>
                  <small>{description}</small>
                </span>
              </label>
            ))}
          </div>
        </Panel>
      ) : draft.step === 3 ? (
        <Panel
          title="Allocate the work"
          subtitle={`${ids.length} ${ids.length === 1 ? "member" : "members"} in the selected cohort`}
        >
          <div className="padded workflow-form">
            <div className="form-field">
              <Label htmlFor="campaign-name">Campaign name</Label>
              <Input
                id="campaign-name"
                value={draft.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="September targeted review"
              />
            </div>
            <div className="form-columns">
              <SelectField
                showLabel
                label="Allocation owner"
                value={draft.owner}
                onChange={(owner) => update({ owner })}
                options={[
                  "Coding team",
                  "QA team",
                  "Retrieval team",
                  "Provider practice",
                ].map((v) => ({ value: v, label: v }))}
              />
              <div className="form-field">
                <Label htmlFor="campaign-due">Due date</Label>
                <Input
                  id="campaign-due"
                  type="date"
                  value={draft.due}
                  onChange={(e) => update({ due: e.target.value })}
                />
              </div>
            </div>
            <div className="definition-list">
              <div>
                <span>Intervention</span>
                <strong>{draft.intervention}</strong>
              </div>
              <div>
                <span>Already covered in an active campaign</span>
                <strong>{ids.filter((id) => covered.has(id)).length}</strong>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                update({
                  excluded: Array.from(
                    new Set([
                      ...draft.excluded,
                      ...draft.selected.filter((id) => covered.has(id)),
                    ]),
                  ),
                })
              }
            >
              Exclude already-covered members
            </Button>
            {draft.excluded.length > 0 && (
              <Button variant="ghost" onClick={() => update({ excluded: [] })}>
                Restore {draft.excluded.length} exclusions
              </Button>
            )}
          </div>
        </Panel>
      ) : (
        <>
          <Panel
            title={draft.preview?.name || "Campaign allocation"}
            subtitle={`Frozen preview · ${draft.preview ? new Date(draft.preview.at).toLocaleString() : "Refresh required"}`}
          >
            <div className="padded">
              <div className="cohort-stats">
                <span>
                  <strong>{draft.preview?.ids.length || 0}</strong> tasks
                </span>
                <span>{draft.preview?.intervention}</span>
                <span>{draft.preview?.owner}</span>
                <span>Due {draft.preview?.due}</span>
              </div>
              <Notice>
                Activation uses this exact cohort. Recommendation versions and
                existing coverage are checked again in the same transaction.
              </Notice>
            </div>
            <DataGrid
              rows={cohort}
              searchLabel="Search frozen allocation"
              columns={[
                { accessorKey: "name", header: "Member" },
                { accessorKey: "member_id", header: "Member ID" },
                {
                  accessorKey: "version",
                  header: "Recommendation version",
                  cell: ({ row }) =>
                    draft.preview?.versions[row.original.id] ?? "—",
                },
                {
                  id: "owner",
                  header: "Owner",
                  cell: () => draft.preview?.owner,
                },
                {
                  id: "covered",
                  header: "Existing coverage",
                  cell: ({ row }) =>
                    draft.preview?.covered.includes(row.original.member_id)
                      ? "Already covered"
                      : "New allocation",
                },
              ]}
            />
          </Panel>
        </>
      )}
      {stale && (
        <div className="form-error" role="alert">
          {stale}
          <Button variant="outline" onClick={freeze} disabled={busy}>
            Refresh preview
          </Button>
        </div>
      )}
      <footer className="workflow-footer">
        <Button
          variant="outline"
          disabled={draft.step === 1 || busy}
          onClick={() =>
            setDraft((d) => ({ ...d, step: d.step - 1, preview: null }))
          }
        >
          Back
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => router.push("/campaigns")}
        >
          Cancel
        </Button>
        <span>
          Draft saved on this device · {ids.length}{" "}
          {ids.length === 1 ? "member" : "members"}
        </span>
        {draft.step < 3 ? (
          <Button
            disabled={!ids.length || ids.length > 500}
            onClick={() => update({ step: draft.step + 1 })}
          >
            Continue <ArrowRight size={15} />
          </Button>
        ) : draft.step === 3 ? (
          <Button
            disabled={
              !draft.name.trim() ||
              !draft.due ||
              !ids.length ||
              ids.length > 500 ||
              busy
            }
            onClick={freeze}
          >
            {busy ? "Preparing preview…" : "Review allocation"}
          </Button>
        ) : (
          <Button
            disabled={!draft.preview || !!stale || busy}
            onClick={activate}
          >
            {busy ? "Activating…" : "Activate campaign"}
          </Button>
        )}
      </footer>
    </div>
  );
}
function CampaignList({ data, user, act }: WorkspaceProps) {
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useDraft<string[]>("planner-cohort", []);
  const [detailId, setDetailId] = useState("");
  const detail = data.campaigns.find((c) => c.id === detailId);
  const [q, setQ] = useUrlState("q", "");
  const returnLink = useReturnLink();
  return (
    <>
      <PageHeader
        title="Campaign planner"
        description="Target the right cohort, allocate the work and follow its progress."
      >
        <Button onClick={() => setCreate(true)}>
          <Plus size={16} />
          Create campaign
        </Button>
      </PageHeader>
      <div className="metric-grid three">
        <Metric
          label="Active campaigns"
          value={String(
            data.campaigns.filter((c) => c.status === "active").length,
          )}
          note="Shared program work"
          icon={<Layers3 size={18} />}
        />
        <Metric
          label="Campaign members"
          value={String(
            new Set(data.campaigns.flatMap((c) => c.member_ids)).size,
          )}
          note="Distinct frozen cohort members"
          icon={<Users size={18} />}
          accent="teal"
        />
        <Metric
          label="Campaign tasks"
          value={String(data.tasks.filter((t) => t.type === "campaign").length)}
          note="Saved campaign task records"
          icon={<Check size={18} />}
        />
      </div>
      <Panel>
        <DataGrid
          rows={data.campaigns}
          searchLabel="Search campaigns or owners…"
          columns={[
            {
              accessorKey: "name",
              header: "Campaign",
              cell: ({ row }) => (
                <>
                  <strong>{row.original.name}</strong>
                  <small>{label(row.original.type)}</small>
                </>
              ),
            },
            {
              id: "members",
              header: "Members",
              accessorFn: (r) => r.member_ids.length,
            },
            { accessorKey: "owner", header: "Owner" },
            {
              accessorKey: "due_date",
              header: "Due date",
              cell: ({ getValue }) =>
                new Date(String(getValue()) + "T12:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                ),
            },
            {
              accessorKey: "progress",
              header: "Reviewed",
              cell: ({ getValue }) => `${getValue()}%`,
            },
            {
              accessorKey: "status",
              header: "Status",
              cell: ({ getValue }) => <Status value={String(getValue())} />,
            },
          ]}
          onRow={(c) => setDetailId(c.id)}
        />
      </Panel>
      <Drawer
        open={!!detail}
        onOpenChange={(v) => !v && setDetailId("")}
        title={detail?.name || "Campaign"}
        description="Frozen membership and current review progress"
      >
        {detail && (
          <>
            <div className="badge-row">
              <Status value={detail.status} />
              <span>{detail.progress}% reviewed</span>
            </div>
            <div className="definition-list">
              <div>
                <span>Owner</span>
                <strong>{detail.owner}</strong>
              </div>
              <div>
                <span>Due date</span>
                <strong>{detail.due_date}</strong>
              </div>
              <div>
                <span>Starting denominator</span>
                <strong>
                  {detail.member_ids.length}{" "}
                  {detail.member_ids.length === 1 ? "member" : "members"}
                </strong>
              </div>
            </div>
            <div className="linked-members">
              {detail.member_ids.map((id) => (
                <Link href={returnLink(`/members/${id}`)} key={id}>
                  {data.opportunities.find((o) => o.member_id === id)?.name ||
                    id}
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
            <div className="drawer-actions">
              {detail.status === "draft" && (
                <Button
                  onClick={() =>
                    act({ action: "activate_campaign", id: detail.id }).catch(
                      () => {},
                    )
                  }
                >
                  Activate saved cohort
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  download("campaigns", user.csrf_token, [detail.id]).catch(
                    (e) => toast.error(e.message),
                  )
                }
              >
                <ArrowDownToLine size={15} />
                Export campaign
              </Button>
            </div>
          </>
        )}
      </Drawer>
      <CampaignDialog
        open={create}
        onOpenChange={setCreate}
        selected={selected}
        onSelectedChange={setSelected}
        data={data}
        act={act}
        onComplete={() => setSelected([])}
      />
    </>
  );
}
