const { google } = require('googleapis');

let _youtube;
function youtube() {
  if (!_youtube) {
    _youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });
  }
  return _youtube;
}

// ── Resolve channel handle/URL to channelId ─────────────────────────────────

async function resolveChannelId(channelInput) {
  const cleaned = channelInput
    .replace(/^https?:\/\/(www\.)?youtube\.com\//, '')
    .replace(/\/$/, '')
    .trim();

  if (/^UC[\w-]{22}$/.test(cleaned)) return cleaned;

  // Could be @handle or channel/UCxxx or c/name
  let handle = cleaned;
  if (handle.startsWith('channel/')) {
    return handle.replace('channel/', '');
  }
  if (handle.startsWith('c/')) {
    handle = handle.replace('c/', '');
  }
  if (handle.startsWith('@')) {
    handle = handle.slice(1);
  }

  const res = await youtube().channels.list({ part: ['id'], forHandle: handle });
  const channelId = res.data?.items?.[0]?.id;
  if (!channelId) throw new Error(`Channel not found for: ${channelInput}`);
  return channelId;
}

// ── Get uploads playlist ID ─────────────────────────────────────────────────

async function getUploadsPlaylistId(channelId) {
  const res = await youtube().channels.list({ part: ['contentDetails'], id: [channelId] });
  const id = res.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!id) throw new Error(`Could not find uploads playlist for channel: ${channelId}`);
  return id;
}

// ── Get video IDs from uploads playlist ──────────────────────────────────────

async function getVideoIds(uploadsPlaylistId, max) {
  const ids = [];
  let pageToken;
  while (ids.length < max) {
    const res = await youtube().playlistItems.list({
      part: ['contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults: Math.min(50, max - ids.length),
      pageToken,
    });
    for (const item of res.data.items || []) {
      ids.push(item.contentDetails.videoId);
    }
    pageToken = res.data.nextPageToken;
    if (!pageToken) break;
  }
  return ids.slice(0, max);
}

// ── ISO 8601 duration parser ────────────────────────────────────────────────

function parseDuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

// ── Get full video details in batches of 50 ─────────────────────────────────

async function getVideoDetails(videoIds) {
  const results = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const res = await youtube().videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: batch,
    });
    for (const item of res.data.items || []) {
      const s = item.snippet || {};
      const st = item.statistics || {};
      const cd = item.contentDetails || {};
      results.push({
        video_id: item.id,
        title: s.title || '',
        description: s.description || '',
        duration: parseDuration(cd.duration),
        release_date: s.publishedAt || null,
        view_count: parseInt(st.viewCount || '0', 10),
        like_count: parseInt(st.likeCount || '0', 10),
        comment_count: parseInt(st.commentCount || '0', 10),
        video_url: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnail_url:
          s.thumbnails?.maxres?.url ||
          s.thumbnails?.high?.url ||
          s.thumbnails?.medium?.url ||
          null,
        transcript: null,
      });
    }
  }
  return results;
}

// ── Fetch transcript for one video (best-effort) ────────────────────────────

async function fetchTranscriptForVideo(videoId) {
  try {
    const { fetchTranscript } = require('youtube-transcript-plus');
    const segments = await fetchTranscript(videoId, { lang: 'en' });
    return segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return null;
  }
}

// ── Main export ─────────────────────────────────────────────────────────────

async function fetchChannelVideos(channelUrl, { max = 10, includeTranscripts = true } = {}) {
  const limit = Math.max(1, Math.min(100, max));
  const channelId = await resolveChannelId(channelUrl);
  const uploadsPlaylistId = await getUploadsPlaylistId(channelId);
  const videoIds = await getVideoIds(uploadsPlaylistId, limit);
  const videos = await getVideoDetails(videoIds);

  if (includeTranscripts) {
    for (const video of videos) {
      video.transcript = await fetchTranscriptForVideo(video.video_id);
    }
  }

  return videos;
}

module.exports = { fetchChannelVideos };
