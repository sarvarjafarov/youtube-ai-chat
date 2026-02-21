// ── Tool declarations for YouTube channel JSON data ──────────────────────────
// Sent to Gemini so it knows what functions exist for channel analysis.

export const JSON_TOOL_DECLARATIONS = [
  {
    name: 'compute_stats_json',
    description:
      'Compute descriptive statistics (mean, median, std, min, max) for any numeric field in the loaded YouTube channel JSON data. ' +
      'Use this when the user asks for statistics, averages, distributions, or summary numbers. ' +
      'Available numeric fields typically include: view_count, like_count, comment_count, duration.',
    parameters: {
      type: 'OBJECT',
      properties: {
        field: {
          type: 'STRING',
          description: 'The numeric field name from the JSON data, e.g. "view_count", "like_count", "comment_count", "duration".',
        },
      },
      required: ['field'],
    },
  },
  {
    name: 'plot_metric_vs_time',
    description:
      'Plot any numeric field (view_count, like_count, comment_count, duration, etc.) vs release_date for the channel videos. ' +
      'Returns chart data that will be rendered as an interactive React chart. ' +
      'Use this when the user asks to plot, chart, graph, or visualize any metric over time.',
    parameters: {
      type: 'OBJECT',
      properties: {
        metric: {
          type: 'STRING',
          description: 'The numeric field to plot on the Y-axis, e.g. "view_count", "like_count", "comment_count", "duration".',
        },
        title: {
          type: 'STRING',
          description: 'Optional chart title. If not provided, one will be generated.',
        },
      },
      required: ['metric'],
    },
  },
  {
    name: 'play_video',
    description:
      'Find and play a YouTube video from the loaded channel data. Returns a video card with title, thumbnail, and URL. ' +
      'The user can specify a video by title (e.g. "play the asbestos video"), by ordinal (e.g. "play the first video", "play the third video"), ' +
      'or by criteria (e.g. "most viewed", "latest video", "shortest video"). ' +
      'Use this when the user asks to play, open, watch, or show a video.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'How to find the video: a title search term, an ordinal like "first" or "3rd", or criteria like "most viewed" or "latest".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'generateImage',
    description:
      'Generate an image from a text prompt. Optionally accepts a reference/anchor image for style guidance. ' +
      'Use this when the user asks to create, generate, make, or draw an image.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: {
          type: 'STRING',
          description: 'Text description of the image to generate.',
        },
      },
      required: ['prompt'],
    },
  },
];

// ── Math helpers ─────────────────────────────────────────────────────────────

const numericValues = (videos, field) =>
  videos.map((v) => parseFloat(v[field])).filter((n) => !isNaN(n));

const median = (sorted) =>
  sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

const fmt = (n) => +n.toFixed(4);

// ── Tool executors ──────────────────────────────────────────────────────────

export function executeJsonTool(toolName, args, videos) {
  switch (toolName) {
    case 'compute_stats_json': {
      const field = args.field;
      const vals = numericValues(videos, field);
      if (!vals.length) {
        const available = Object.keys(videos[0] || {}).join(', ');
        return { error: `No numeric values found for field "${field}". Available fields: ${available}` };
      }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sorted = [...vals].sort((a, b) => a - b);
      const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      return {
        field,
        count: vals.length,
        mean: fmt(mean),
        median: fmt(median(sorted)),
        std: fmt(Math.sqrt(variance)),
        min: Math.min(...vals),
        max: Math.max(...vals),
      };
    }

    case 'plot_metric_vs_time': {
      const metric = args.metric;
      const title = args.title || `${metric} over time`;

      // Sort by release_date, build chart data
      const sorted = [...videos]
        .filter((v) => v.release_date && v[metric] !== undefined && v[metric] !== null)
        .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

      if (!sorted.length) {
        return { error: `No data found for metric "${metric}" with release dates.` };
      }

      const data = sorted.map((v) => ({
        date: new Date(v.release_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        fullDate: v.release_date,
        value: typeof v[metric] === 'number' ? v[metric] : parseFloat(v[metric]) || 0,
        title: v.title || '',
      }));

      return {
        _chartType: 'metric_vs_time',
        metric,
        title,
        data,
      };
    }

    case 'play_video': {
      const query = (args.query || '').toLowerCase().trim();
      if (!videos.length) return { error: 'No videos loaded.' };

      let found = null;

      // Ordinal match: "first", "second", "1st", "2nd", "third", "3rd", etc.
      const ordinals = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4, sixth: 5, seventh: 6, eighth: 7, ninth: 8, tenth: 9 };
      const ordMatch = query.match(/(\d+)(?:st|nd|rd|th)/);
      if (ordinals[query] !== undefined) {
        found = videos[ordinals[query]];
      } else if (ordMatch) {
        found = videos[parseInt(ordMatch[1], 10) - 1];
      }

      // Criteria match: "most viewed", "latest", "oldest", "shortest", "longest", "most liked"
      if (!found) {
        const sorted = [...videos];
        if (/most\s*view/i.test(query)) {
          sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
          found = sorted[0];
        } else if (/least\s*view/i.test(query)) {
          sorted.sort((a, b) => (a.view_count || 0) - (b.view_count || 0));
          found = sorted[0];
        } else if (/most\s*lik/i.test(query)) {
          sorted.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
          found = sorted[0];
        } else if (/latest|newest|recent/i.test(query)) {
          sorted.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
          found = sorted[0];
        } else if (/oldest|earliest/i.test(query)) {
          sorted.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
          found = sorted[0];
        } else if (/shortest/i.test(query)) {
          sorted.sort((a, b) => (a.duration || 0) - (b.duration || 0));
          found = sorted[0];
        } else if (/longest/i.test(query)) {
          sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0));
          found = sorted[0];
        }
      }

      // Title match (fuzzy)
      if (!found) {
        const terms = query.split(/\s+/);
        found = videos.find((v) => {
          const t = (v.title || '').toLowerCase();
          return terms.every((term) => t.includes(term));
        });
        // Fallback: any term match
        if (!found) {
          found = videos.find((v) => {
            const t = (v.title || '').toLowerCase();
            return terms.some((term) => term.length > 2 && t.includes(term));
          });
        }
      }

      if (!found) return { error: `No video found matching "${args.query}".` };

      return {
        _cardType: 'video',
        title: found.title,
        video_url: found.video_url,
        thumbnail_url: found.thumbnail_url || `https://i.ytimg.com/vi/${found.video_id}/hqdefault.jpg`,
        view_count: found.view_count,
        like_count: found.like_count,
        duration: found.duration,
      };
    }

    case 'generateImage': {
      // This is handled specially in Chat.js — return the prompt so the caller knows
      return { _action: 'generateImage', prompt: args.prompt };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Build a summary of the JSON data for Gemini context ─────────────────────

export function buildJsonSummary(videos) {
  if (!videos.length) return '';

  const lines = [`**YouTube Channel Data: ${videos.length} videos**\n`];

  // Numeric field stats
  const numericFields = ['view_count', 'like_count', 'comment_count', 'duration'];
  lines.push('**Numeric fields:**');
  for (const field of numericFields) {
    const vals = numericValues(videos, field);
    if (vals.length) {
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      lines.push(`  - "${field}": mean=${fmt(mean)}, min=${Math.min(...vals)}, max=${Math.max(...vals)}, n=${vals.length}`);
    }
  }

  // Video titles list
  lines.push('\n**Videos (by release date):**');
  const sorted = [...videos].sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
  sorted.forEach((v, i) => {
    const date = v.release_date ? new Date(v.release_date).toLocaleDateString() : 'unknown';
    lines.push(`  ${i + 1}. "${v.title}" (${date}, ${(v.view_count || 0).toLocaleString()} views)`);
  });

  return lines.join('\n');
}
