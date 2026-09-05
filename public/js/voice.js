/* ============================================================
   BOB — spraakloop
   Spraak eruit : Cartesia TTS via de eigen server (sleutel blijft server-side)
   Spraak erin  : MediaRecorder -> Cartesia STT (ink-whisper, Nederlands)
   Wakewoord    : Web Speech API van de browser, puur als trigger.
   ============================================================ */

const listeners = new Map();
const emit = (event, detail) => (listeners.get(event) || []).forEach((fn) => fn(detail));

export const voice = {
  ready: false,
  recording: false,
  speaking: false,
  wakeEnabled: false,

  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(fn);
    return this;
  },

  async init() {
    try {
      const res = await fetch('/api/voice/status');
      const json = await res.json();
      this.ready = Boolean(json.ready);
    } catch { this.ready = false; }
    emit('ready', this.ready);
    return this.ready;
  },

  /* ---------------- spraak eruit ---------------- */

  _audio: null,

  async speak(text) {
    if (!this.ready || !text) return false;
    this.stopSpeaking();
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `TTS ${res.status}`);

      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      this._audio = audio;
      this.speaking = true;
      emit('speaking', true);

      audio.onended = audio.onerror = () => {
        this.speaking = false;
        emit('speaking', false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
      return true;
    } catch (err) {
      this.speaking = false;
      emit('speaking', false);
      emit('error', err.message);
      return false;
    }
  },

  stopSpeaking() {
    if (this._audio) { this._audio.pause(); this._audio = null; }
    if (this.speaking) { this.speaking = false; emit('speaking', false); }
  },

  /** De dagbriefing als kant-en-klaar audiobestand vanaf de server. */
  async playBriefing() {
    this.stopSpeaking();
    try {
      const res = await fetch('/api/voice/briefing');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Briefing mislukt');
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      this._audio = audio;
      this.speaking = true; emit('speaking', true);
      audio.onended = audio.onerror = () => { this.speaking = false; emit('speaking', false); URL.revokeObjectURL(url); };
      await audio.play();
    } catch (err) { emit('error', err.message); }
  },

  /* ---------------- spraak erin ---------------- */

  _recorder: null,
  _chunks: [],
  _stream: null,

  async startRecording() {
    if (this.recording) return;
    this.stopSpeaking();
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch {
      emit('error', 'Geen toegang tot de microfoon. Sta het toe in de adresbalk van je browser.');
      return;
    }

    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
      .find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || '';

    this._chunks = [];
    this._recorder = new MediaRecorder(this._stream, mime ? { mimeType: mime } : undefined);
    this._recorder.ondataavailable = (e) => { if (e.data.size) this._chunks.push(e.data); };
    this._recorder.start();
    this.recording = true;
    emit('recording', true);
  },

  /** Stopt de opname, stuurt hem naar Cartesia en geeft de tekst terug. */
  async stopRecording() {
    if (!this.recording || !this._recorder) return null;

    const blob = await new Promise((resolve) => {
      this._recorder.onstop = () => resolve(new Blob(this._chunks, { type: this._recorder.mimeType || 'audio/webm' }));
      this._recorder.stop();
    });

    this._stream?.getTracks().forEach((t) => t.stop());
    this._stream = null; this._recorder = null;
    this.recording = false;
    emit('recording', false);

    if (blob.size < 1200) { emit('error', 'Te kort — houd de knop iets langer vast.'); return null; }

    emit('transcribing', true);
    try {
      const form = new FormData();
      form.append('audio', blob, 'opname.webm');
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `STT ${res.status}`);
      emit('transcribing', false);
      emit('transcript', json.text);
      return json.text;
    } catch (err) {
      emit('transcribing', false);
      emit('error', err.message);
      return null;
    }
  },

  /* ---------------- wakewoord ---------------- */

  _wake: null,

  /**
   * Luistert continu mee met de gratis spraakherkenning van de browser
   * en let alleen op "hey bob". Zodra dat valt, start de echte opname
   * die naar Cartesia gaat. Zo blijft de API-rekening laag.
   */
  enableWakeWord(onWake) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { emit('error', 'Wakewoord werkt alleen in Chrome of Edge.'); return false; }

    const rec = new SR();
    rec.lang = 'nl-NL';
    rec.continuous = true;
    rec.interimResults = true;

    const triggers = ['hey bob', 'hé bob', 'he bob', 'hoi bob', 'oké bob', 'ok bob', 'hey bop', 'hey bab'];

    rec.onresult = (event) => {
      if (this.recording || this.speaking) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const said = event.results[i][0].transcript.toLowerCase().trim();
        if (triggers.some((t) => said.includes(t))) { onWake?.(); return; }
      }
    };
    rec.onerror = (e) => { if (e.error === 'not-allowed') { this.wakeEnabled = false; emit('wake', false); } };
    rec.onend = () => { if (this.wakeEnabled) { try { rec.start(); } catch { /* herstart-race */ } } };

    try { rec.start(); } catch { return false; }
    this._wake = rec;
    this.wakeEnabled = true;
    emit('wake', true);
    return true;
  },

  disableWakeWord() {
    this.wakeEnabled = false;
    try { this._wake?.stop(); } catch { /* al gestopt */ }
    this._wake = null;
    emit('wake', false);
  },
};
