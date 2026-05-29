import { getBackendUrl } from './whatsappClient';

export interface ArtifactRequest {
  title: string;
  prompt: string;
}

export interface ArtifactResponse {
  ok: boolean;
  taskId: string;
  status: string;
  previewUrl?: string;
  error?: string;
}

export interface ArtifactTaskStatus {
  taskId: string;
  status: string;
  previewUrl: string | null;
  downloadUrl: string | null;
  error: string | null;
  output: { type: string; title: string; content: string; fileType: string } | null;
}

export async function generateArtifact(userId: string, args: ArtifactRequest): Promise<ArtifactResponse> {
  const res = await fetch(`${getBackendUrl()}/api/artifacts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title: args.title, prompt: args.prompt }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server returned ${res.status}`);
  }

  return res.json();
}

export async function pollArtifactTask(
  taskId: string,
  onUpdate?: (status: ArtifactTaskStatus) => void,
  timeoutMs = 60000,
): Promise<ArtifactTaskStatus> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${getBackendUrl()}/api/tasks/${taskId}`);
    if (!res.ok) {
      if (res.status === 404) {
        await delay(1000);
        continue;
      }
      throw new Error(`Server returned ${res.status}`);
    }

    const data: ArtifactTaskStatus = await res.json();
    onUpdate?.(data);

    if (data.status === 'done' || data.status === 'error') {
      return data;
    }

    await delay(1500);
  }

  throw new Error('Task timed out');
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
