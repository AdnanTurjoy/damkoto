"use client";

import { Flag, Loader2, MapPin, MessageCircle, Pencil, Reply, Smile, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { formatDateTime, translateLoose } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";
import { LocationSelector, type LocationValue } from "@/features/locations/components/location-selector";
import type { LocationOption } from "@/features/locations/queries";
import { addCommentAction, deleteCommentAction, editCommentAction } from "../actions";
import type { CommentView } from "../service";
import type { StickerId } from "../stickers";
import { ReportContentDialog } from "./report-content-dialog";
import { Sticker, StickerPicker } from "./sticker";

interface Props {
  reportId: string;
  initial: { comments: CommentView[]; nextCursor: string | null };
  divisions: LocationOption[];
  districts: LocationOption[];
}

const emptyLocation: LocationValue = { divisionId: "", districtId: "", upazilaId: "", locality: "", method: "admin" };

export function CommentSection({ reportId, initial, divisions, districts }: Props) {
  const { t } = useI18n();
  const [comments, setComments] = useState(initial.comments);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const toast = useToast();

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);
  const visibleCount = comments.filter((c) => !c.deleted).length;

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/prices/${reportId}/comments?cursor=${encodeURIComponent(cursor)}`);
      const json = (await res.json()) as { ok: boolean; data?: { comments: CommentView[]; nextCursor: string | null } };
      if (!json.ok || !json.data) throw new Error();
      setComments((prev) => [...prev, ...json.data!.comments.filter((c) => !prev.some((p) => p.id === c.id))]);
      setCursor(json.data.nextCursor);
    } catch {
      toast(t("errors.server"), "error");
    } finally {
      setLoadingMore(false);
    }
  }

  const replace = (updated: CommentView) => setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  const markDeleted = (id: string) => setComments((prev) => prev.map((c) => (c.id === id ? { ...c, deleted: true, body: null, stickerId: null, canModify: false } : c)));

  return (
    <section aria-labelledby="comments-heading" className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-5 text-brand-600" aria-hidden />
        <h2 id="comments-heading" className="text-xl font-bold">
          {t("comments.title")}
        </h2>
        <span className="text-sm text-muted">· {t("comments.count", { count: visibleCount })}</span>
      </div>

      <CommentComposer reportId={reportId} divisions={divisions} districts={districts} onPosted={(c) => setComments((prev) => [...prev, c])} />

      {topLevel.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/60 px-5 py-8 text-center text-[15px] text-muted">{t("comments.empty")}</p>
      ) : (
        <ol className="space-y-4">
          {topLevel.map((comment) => (
            <li key={comment.id} className="rounded-2xl border border-line bg-white p-4">
              <CommentItem comment={comment} onReply={() => setReplyTo(comment.id)} onUpdated={replace} onDeleted={markDeleted} />
              {(repliesOf(comment.id).length > 0 || replyTo === comment.id) && (
                <ol className="mt-3 space-y-3 border-l-2 border-brand-100 pl-4">
                  {repliesOf(comment.id).map((reply) => (
                    <li key={reply.id}>
                      <CommentItem comment={reply} onUpdated={replace} onDeleted={markDeleted} />
                    </li>
                  ))}
                  {replyTo === comment.id && (
                    <li>
                      <CommentComposer
                        reportId={reportId}
                        parentId={comment.id}
                        divisions={divisions}
                        districts={districts}
                        compact
                        onCancel={() => setReplyTo(null)}
                        onPosted={(c) => {
                          setComments((prev) => [...prev, c]);
                          setReplyTo(null);
                        }}
                      />
                    </li>
                  )}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}

      {cursor && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="w-full">
          {loadingMore && <Loader2 className="animate-spin" />} {t("comments.loadMore")}
        </Button>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  onReply,
  onUpdated,
  onDeleted,
}: {
  comment: CommentView;
  onReply?: () => void;
  onUpdated: (c: CommentView) => void;
  onDeleted: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body ?? "");
  const [flagOpen, setFlagOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (comment.deleted) return <p className="text-sm italic text-muted">{t("comments.deleted")}</p>;

  const place = locale === "bn" ? comment.placeBn : comment.placeEn;

  function save() {
    startTransition(async () => {
      const result = await editCommentAction({ commentId: comment.id, body, stickerId: comment.stickerId ?? "" });
      if (!result.ok) return toast(translateLoose(t, result.error), "error");
      onUpdated(result.data);
      setEditing(false);
    });
  }

  function remove() {
    if (!window.confirm(t("comments.deleteConfirm"))) return;
    startTransition(async () => {
      const result = await deleteCommentAction(comment.id);
      if (!result.ok) return toast(translateLoose(t, result.error), "error");
      onDeleted(comment.id);
    });
  }

  return (
    <article>
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <span className="font-bold">{comment.displayName ?? t("common.anonymous")}</span>
        <time dateTime={comment.createdAt} className="text-muted">
          {formatDateTime(locale, comment.createdAt)}
        </time>
        {comment.edited && <span className="text-xs text-muted">· {t("comments.edited")}</span>}
        {place && (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <MapPin className="size-3" aria-hidden /> {t("comments.from", { place })}
          </span>
        )}
      </header>
      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} aria-label={t("comments.edit")} />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={pending}>
              {t("comments.save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 space-y-2">
          {comment.body && <p className="whitespace-pre-line break-words text-[15px] leading-relaxed">{comment.body}</p>}
          {comment.stickerId && <Sticker id={comment.stickerId} />}
        </div>
      )}
      {!editing && (
        <div className="mt-2 flex flex-wrap gap-1 text-[13px]">
          {onReply && (
            <ActionLink onClick={onReply} icon={<Reply />}>
              {t("comments.reply")}
            </ActionLink>
          )}
          {comment.canModify && (
            <>
              <ActionLink onClick={() => setEditing(true)} icon={<Pencil />}>
                {t("comments.edit")}
              </ActionLink>
              <ActionLink onClick={remove} icon={<Trash2 />} disabled={pending}>
                {t("comments.delete")}
              </ActionLink>
            </>
          )}
          <ActionLink onClick={() => setFlagOpen(true)} icon={<Flag />}>
            {t("comments.report")}
          </ActionLink>
        </div>
      )}
      <ReportContentDialog open={flagOpen} onClose={() => setFlagOpen(false)} targetType="comment" targetId={comment.id} />
    </article>
  );
}

function ActionLink({ onClick, icon, disabled, children }: { onClick: () => void; icon: React.ReactNode; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg px-2 font-semibold text-muted hover:bg-paper hover:text-ink [&_svg]:size-3.5">
      {icon}
      {children}
    </button>
  );
}

function CommentComposer({
  reportId,
  parentId,
  divisions,
  districts,
  compact,
  onPosted,
  onCancel,
}: {
  reportId: string;
  parentId?: string;
  divisions: LocationOption[];
  districts: LocationOption[];
  compact?: boolean;
  onPosted: (c: CommentView) => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [sticker, setSticker] = useState<StickerId | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [withLocation, setWithLocation] = useState(false);
  const [location, setLocation] = useState<LocationValue>(emptyLocation);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const idBase = parentId ? `reply-${parentId}` : "comment";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim() && !sticker) return setError(t("errors.commentEmpty"));
    startTransition(async () => {
      const result = await addCommentAction({
        reportId,
        parentId,
        body,
        stickerId: sticker ?? "",
        displayName: name,
        ...(withLocation ? { districtId: location.districtId, upazilaId: location.upazilaId, locality: location.locality } : {}),
      });
      if (!result.ok) return setError(translateLoose(t, result.error));
      onPosted(result.data);
      setBody("");
      setSticker(null);
      setShowStickers(false);
      toast(t("comments.post"));
    });
  }

  return (
    <form onSubmit={submit} className={cn("space-y-3", !compact && "rounded-2xl border border-line bg-white p-4")}>
      <label htmlFor={`${idBase}-body`} className="sr-only">
        {compact ? t("comments.replyPlaceholder") : t("comments.placeholder")}
      </label>
      <Textarea
        id={`${idBase}-body`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={compact ? 2 : 3}
        placeholder={compact ? t("comments.replyPlaceholder") : t("comments.placeholder")}
        autoFocus={compact}
      />
      {sticker && (
        <div className="flex items-center gap-2">
          <Sticker id={sticker} size="sm" />
          <button type="button" className="text-xs font-semibold text-muted underline" onClick={() => setSticker(null)}>
            {t("comments.removeSticker")}
          </button>
        </div>
      )}
      {showStickers && <StickerPicker value={sticker} onChange={setSticker} />}
      {withLocation && <LocationSelector idPrefix={`${idBase}-loc`} value={location} onChange={setLocation} divisions={divisions} districts={districts} compact />}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor={`${idBase}-name`} className="sr-only">
          {t("comments.name")}
        </label>
        <Input id={`${idBase}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={t("comments.name")} className="h-10 sm:max-w-52" />
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowStickers((s) => !s)} aria-expanded={showStickers}>
            <Smile /> {t("comments.sticker")}
          </Button>
          {!compact && (
            <Button variant="ghost" size="sm" onClick={() => setWithLocation((v) => !v)} aria-expanded={withLocation}>
              <MapPin /> {withLocation ? t("comments.removeLocation") : t("comments.addLocation")}
            </Button>
          )}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {t("comments.cancelReply")}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {pending ? t("comments.posting") : compact ? t("comments.reply") : t("comments.post")}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
