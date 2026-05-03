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
  file_name?: string;
  filename?: string;
  size?: number;
  content_type?: string;
  scan_status?: "pending" | "clean" | "blocked";
  download_url?: string;
};

type CommentsResponse = {
  results?: CommentDto[];
};

type PresignResponse = {
  uploads?: PresignedUploadDto[];
};

type PresignedUploadDto = {
  attachment_id?: string;
  id?: string;
  upload_url?: string;
  url?: string;
  file_name?: string;
};

export type SelectedUpload = {
  file: File;
  localId: string;
};

function normalizeAttachment(attachment: AttachmentDto): RequestCommentAttachment {
  return {
    id: attachment.id ?? attachment.attachmentid ?? crypto.randomUUID(),
    fileName: attachment.file_name ?? attachment.filename ?? "Attachment",
    size: attachment.size ?? 0,
    contentType: attachment.content_type,
    scanStatus: attachment.scan_status,
    downloadUrl: attachment.download_url,
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

async function presignUploads(requestId: string, files: File[]) {
  if (files.length === 0) return [];

  const response = await api.post<PresignResponse | PresignedUploadDto[]>(
    `/requests/${encodeURIComponent(requestId)}/attachments/presign/`,
    {
      files: files.map((file) => ({
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        size: file.size,
      })),
    },
  );

  return Array.isArray(response.data) ? response.data : response.data.uploads ?? [];
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
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
    }),
  );
}

export async function createRequestComment(requestId: string, body: string, files: File[]) {
  const uploads = await presignUploads(requestId, files);
  await uploadFilesToStorage(files, uploads);

  const response = await api.post<CommentDto>(
    `/requests/${encodeURIComponent(requestId)}/comments/`,
    {
      body,
      attachments: uploads.map((upload) => upload.attachment_id ?? upload.id).filter(Boolean),
    },
  );

  return normalizeComment(response.data);
}

export function makeLocalComment(body: string, files: File[]): RequestComment {
  return {
    id: crypto.randomUUID(),
    authorName: "Ana Gomez",
    body,
    createdAt: new Date().toISOString(),
    attachments: files.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      size: file.size,
      contentType: file.type,
      scanStatus: "pending",
    })),
  };
}
