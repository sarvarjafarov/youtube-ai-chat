import { useState } from 'react';
import './YouTubeDownload.css';

const API = process.env.REACT_APP_API_URL || '';

export default function YouTubeDownload() {
  const [channelUrl, setChannelUrl] = useState('');
  const [maxVideos, setMaxVideos] = useState(10);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleDownload = async () => {
    if (!channelUrl.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setProgress('Connecting to YouTube...');

    try {
      setProgress(`Downloading data for up to ${maxVideos} videos...`);
      const res = await fetch(
        `${API}/api/youtube/channel-videos?channelUrl=${encodeURIComponent(channelUrl.trim())}&max=${maxVideos}&transcripts=true`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Download failed');

      setProgress(`Done! Downloaded ${data.count} videos.`);
      setResult(data);
    } catch (err) {
      setError(err.message);
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.videos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const channelName = channelUrl.replace(/.*\/@?/, '').replace(/\/.*/, '') || 'channel';
    a.download = `${channelName}_videos.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="yt-download">
      <div className="yt-download-card">
        <h2>YouTube Channel Download</h2>
        <p className="yt-download-desc">
          Enter a YouTube channel URL to download video metadata as JSON.
        </p>

        <div className="yt-download-form">
          <label>Channel URL</label>
          <input
            type="text"
            placeholder="https://www.youtube.com/@veritasium"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            disabled={loading}
          />

          <label>Max Videos (1–100)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={maxVideos}
            onChange={(e) => setMaxVideos(Math.min(100, Math.max(1, +e.target.value || 10)))}
            disabled={loading}
          />

          <button
            className="yt-download-btn"
            onClick={handleDownload}
            disabled={loading || !channelUrl.trim()}
          >
            {loading ? 'Downloading...' : 'Download Channel Data'}
          </button>
        </div>

        {loading && (
          <div className="yt-progress">
            <div className="yt-progress-bar">
              <div className="yt-progress-fill" />
            </div>
            <span className="yt-progress-text">{progress}</span>
          </div>
        )}

        {error && <p className="yt-error">{error}</p>}

        {result && !loading && (
          <div className="yt-result">
            <p className="yt-result-count">{result.count} videos downloaded</p>
            <div className="yt-result-preview">
              {result.videos.slice(0, 3).map((v, i) => (
                <div key={i} className="yt-video-preview">
                  {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} />}
                  <div>
                    <strong>{v.title}</strong>
                    <span>{v.view_count?.toLocaleString()} views</span>
                  </div>
                </div>
              ))}
              {result.count > 3 && (
                <p className="yt-more">...and {result.count - 3} more</p>
              )}
            </div>
            <button className="yt-save-btn" onClick={handleSaveJson}>
              Download JSON File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
