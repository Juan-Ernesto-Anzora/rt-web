import axios from "axios";
import api from "../lib/api";

export type RequestCommentAttachment = {
  id: string;
  fileName: string;
  size: number;
  contentType?: string;
  scanStatus?: "pending" | "clean" | "blocked";
  downloadUrl?: string;
};

export type RequestComment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  attachments: RequestCommentAttachment[];
};

type CommentDto = {
  id?: string;
  commentid?: string;
  author_name?: string;
  author?: { name?: string };
  body?: string;
  message?: string;
  created_at?: string;
  attachments?: AttachmentDto[];
};

type AttachmentDto = {
  id?: string;
  attachmentid?: string;
  attachment_id?: string;
  file_name?: string;
  filename?: string;
  size?: number;
  sizebytes?: number;
  size_bytes?: number;
  content_type?: string;
  contenttype?: string;
  scan_status?: "pending" | "clean" | "blocked";
  scanstatus?: "pending" | "clean" | "blocked";
  download_url?: string;
  storageurl?: string;
  storage_url?: string;
};

type CommentsResponse = {
  results?: CommentDto[];
};

type PresignResponse = {
  request_id?: string;
  group_id?: string;
  uploads?: PresignedUploadDto[];
};

type PresignedUploadDto = {
  attachment_id?: string;
  id?: string;
  upload_url?: string;
  url?: string;
  file_name?: string;
  filename?: string;
  content_type?: string;
  size_bytes?: number;
  object_key?: string;
  headers?: Record<string, string>;
};

export function normalizeAttachment(attachment: AttachmentDto): RequestCommentAttachment {
  return {
    id: attachment.id ?? attachment.attachment_id ?? attachment.attachmentid ?? crypto.randomUUID(),
    fileName: attachment.file_name ?? attachment.filename ?? "Attachment",
    size: attachment.size ?? attachment.size_bytes ?? attachment.sizebytes ?? 0,
    contentType: attachment.content_type ?? attachment.contenttype,
    scanStatus: attachment.scan_status ?? attachment.scanstatus,
    downloadUrl: attachment.download_url ?? attachment.storage_url ?? attachment.storageurl,
  };
}

function normalizeComment(comment: CommentDto): RequestComment {
  return {
    id: comment.id ?? comment.commentid ?? crypto.randomUUID(),
    authorName: comment.author_name ?? comment.author?.name ?? "Unknown user",
    body: comment.body ?? comment.message ?? "",
    createdAt: comment.created_at ?? new Date().toISOString(),
    attachments: (comment.attachments ?? []).map(normalizeAttachment),
  };
}

export async function listRequestComments(requestId: string) {
  const response = await api.get<CommentsResponse | CommentDto[]>(
    `/requests/${encodeURIComponent(requestId)}/comments/`,
    { params: { page_size: 25, sort: "created_at" } },
  );
  const comments = Array.isArray(response.data) ? response.data : response.data.results ?? [];
  return comments.map(normalizeComment);
}

export async function listRequestAttachments(requestId: string) {
  const response = await api.get<{ results?: AttachmentDto[] } | AttachmentDto[]>(
    `/requests/${encodeURIComponent(requestId)}/attachments/`,
    { params: { page_size: 50, sort: "-created_at" } },
  );
  const attachments = Array.isArray(response.data) ? response.data : response.data.results ?? [];
  return attachments.map(normalizeAttachment);
}

async function initUploads(requestId: string, files: File[]) {
  if (files.length === 0) return { groupId: "", uploads: [] };

  const response = await api.post<PresignResponse | PresignedUploadDto[]>(
    "/attachments/init",
    {
      request_id: requestId,
      files: files.map((file) => ({
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      })),
    },
  );

  return {
    groupId: Array.isArray(response.data) ? "" : response.data.group_id ?? "",
    uploads: Array.isArray(response.data) ? response.data : response.data.uploads ?? [],
  };
}

async function uploadFilesToStorage(files: File[], uploads: PresignedUploadDto[]) {
  await Promise.all(
    files.map((file, index) => {
      const upload = uploads[index];
      const uploadUrl = upload?.upload_url ?? upload?.url;
      if (!uploadUrl) {
        throw new Error(`Missing upload URL for ${file.name}`);
      }
      return axios.put(uploadUrl, file, {
        headers: upload.headers ?? { "Content-Type": file.type || "application/octet-stream" },
      });
    }),
  );
}

export async function createRequestComment(requestId: string, body: string, files: File[]) {
  if (files.length === 0) {
    const response = await api.post<CommentDto>(
      `/requests/${encodeURIComponent(requestId)}/comments/`,
      { body },
    );

    return normalizeComment(response.data);
  }

  const { groupId, uploads } = await initUploads(requestId, files);
  await uploadFilesToStorage(files, uploads);

  const response = await api.post<{
    comment_id?: string;
    group_id?: string;
    attachments?: AttachmentDto[];
  }>(
    "/attachments/finalize",
    {
      request_id: requestId,
      group_id: groupId,
      comment_markdown: body,
      files: uploads.map((upload, index) => {
        const file = files[index];
        return {
          object_key: upload.object_key,
          filename: upload.filename ?? upload.file_name ?? file.name,
          content_type: (upload.content_type ?? file.type) || undefined,
          size_bytes: upload.size_bytes ?? file.size,
        };
      }),
    },
  );

  return {
    id: response.data.comment_id ?? crypto.randomUUID(),
    authorName: "Current user",
    body,
    createdAt: new Date().toISOString(),
    attachments: (response.data.attachments ?? []).map(normalizeAttachment),
  };
}
