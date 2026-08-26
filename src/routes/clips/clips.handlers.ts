import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { StatusCodes } from 'http-status-codes/build/cjs/status-codes';

import type { AppRouteHander } from '@/lib/types';

import type { CutClipRoute } from './clips.routes';

const ALLOWED_HOSTNAMES = ['youtube.com', 'youtu.be', 'music.youtube.com'];
const MAX_CONCURRENT = 3;
const TIMEOUT_MS = 90_000;
const STDERR_MAX = 500;

let active = 0;

function acquire(): boolean {
  if (active >= MAX_CONCURRENT) return false;
  active++;
  return true;
}

function release() {
  active--;
}

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

export const cutClip: AppRouteHander<CutClipRoute> = async (c) => {
  const body = c.req.valid('json');
  const hostname = new URL(body.url).hostname.replace(/^www\./, '');
  if (!ALLOWED_HOSTNAMES.includes(hostname)) {
    return c.json({ message: 'URL must be a YouTube link' }, StatusCodes.BAD_REQUEST);
  }

  if (!acquire()) {
    return c.json({ message: 'Too many concurrent requests' }, StatusCodes.TOO_MANY_REQUESTS);
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'clip-'));
  try {
    const videoId = new URL(body.url).searchParams.get('v') ?? 'clip';
    const clipName = body.name ? sanitizeName(body.name) : `clip_${body.start}-${body.end}`;

    const args = [
      '--no-playlist',
      '--no-warnings',
      '-f',
      'ba/best',
      '--download-sections',
      `*${body.start}-${body.end}`,
      '--force-keyframes-at-cuts',
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '192K',
      '--postprocessor-args',
      'ffmpeg:-af loudnorm=I=-16:TP=-1.5:LRA=11',
      '-o',
      join(tmpDir, `${videoId}.%(ext)s`),
      body.url,
    ];

    await new Promise<void>((resolve, reject) => {
      execFile('yt-dlp', args, { timeout: TIMEOUT_MS }, (error, _stdout, stderr) => {
        if (error) {
          const tail = stderr?.slice(-STDERR_MAX) ?? '';
          reject(new Error(tail || error.message));
        } else {
          resolve();
        }
      });
    });

    const files = await readdir(tmpDir);
    if (files.length === 0) {
      return c.json({ message: 'yt-dlp produced no output' }, StatusCodes.BAD_GATEWAY);
    }

    const filePath = join(tmpDir, files[0]);
    const buffer = await readFile(filePath);

    return c.body(buffer, StatusCodes.OK, {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${clipName}.mp3"`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Clip generation failed: ${message}`);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
    release();
  }
};
