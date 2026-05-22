let pipeline = null;
let cachedModel = null;
let _transformersModule = null;

async function _loadTransformers() {
  if (_transformersModule) return _transformersModule;
  _transformersModule = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  return _transformersModule;
}

self.onmessage = async function(e) {
  const { type, modelName, audioData, language } = e.data;

  if (type === 'ping') {
    self.postMessage({ type: 'pong' });
    return;
  }

  if (type === 'load') {
    try {
      const mod = await _loadTransformers();
      self.postMessage({ type: 'progress', status: 'loading', progress: 10 });
      pipeline = await mod.pipeline('automatic-speech-recognition', modelName, {
        progress_callback: (p) => {
          if (p.status === 'progress' && p.progress) {
            self.postMessage({ type: 'progress', status: 'loading', progress: 10 + p.progress * 0.5 });
          }
        }
      });
      cachedModel = modelName;
      self.postMessage({ type: 'loaded' });
    } catch (err) {
      self.postMessage({ type: 'error', error: err.message || 'Model load failed' });
    }
  }

  if (type === 'transcribe') {
    try {
      if (!pipeline || cachedModel !== modelName) {
        const mod = await _loadTransformers();
        pipeline = await mod.pipeline('automatic-speech-recognition', modelName, {
          progress_callback: (p) => {
            if (p.status === 'progress' && p.progress) {
              self.postMessage({ type: 'progress', status: 'loading', progress: 10 + p.progress * 0.5 });
            }
          }
        });
        cachedModel = modelName;
      }
      self.postMessage({ type: 'progress', status: 'transcribing', progress: 65 });
      const result = await pipeline(audioData, {
        language: language || 'italian',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        chunk_callback: () => {
          self.postMessage({ type: 'progress', status: 'segment' });
        }
      });
      const chunks = (result && result.chunks) ? result.chunks : [];
      const text = typeof result === 'string' ? result : (result.text || chunks.map(c => c.text).join(''));
      self.postMessage({ type: 'result', text: text.trim(), chunks });
    } catch (err) {
      self.postMessage({ type: 'error', error: err.message || 'Transcription failed' });
    }
  }
};
