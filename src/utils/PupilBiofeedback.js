/**
 * Small, dependency-free camera signal. It estimates relative pupil darkness
 * inside two eye regions supplied by the browser's FaceDetector API. The
 * signal is deliberately treated as a response hint, not a medical measure.
 */
export class PupilBiofeedback {
  #video;
  #canvas = document.createElement('canvas');
  #ctx = this.#canvas.getContext('2d', { willReadFrequently: true });
  #detector = window.FaceDetector ? new window.FaceDetector({ fastMode: true }) : null;
  #face = null;
  #lastDetection = 0;
  #stream = null;
  #samples = [];

  get available() {
    return Boolean(navigator.mediaDevices?.getUserMedia);
  }

  async start() {
    if (!window.isSecureContext) {
      throw new Error('Camera access requires HTTPS or localhost.');
    }
    if (!this.available) {
      throw new Error('This browser does not expose camera access.');
    }
    if (!this.#video) {
      this.#video = document.createElement('video');
      this.#video.autoplay = true;
      this.#video.muted = true;
      this.#video.playsInline = true;
    }
    if (!this.#stream) {
      this.#stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      this.#video.srcObject = this.#stream;
      await this.#video.play();
    }
    return true;
  }

  stop() {
    this.#stream?.getTracks().forEach(track => track.stop());
    this.#stream = null;
    this.#samples = [];
  }

  async sample(now = performance.now()) {
    if (!this.#video || this.#video.readyState < 2) return null;
    const width = this.#video.videoWidth;
    const height = this.#video.videoHeight;
    if (!width || !height) return null;
    if (now - this.#lastDetection > 250 && this.#detector) {
      const faces = await this.#detector.detect(this.#video);
      this.#face = faces[0]?.boundingBox || null;
      this.#lastDetection = now;
    }
    if (!this.#detector) {
      this.#face = { x: width * 0.15, y: height * 0.12, width: width * 0.7, height: height * 0.76 };
    }
    if (!this.#face) return null;
    this.#canvas.width = width;
    this.#canvas.height = height;
    this.#ctx.drawImage(this.#video, 0, 0, width, height);

    const face = this.#face;
    const eyeY = face.y + face.height * 0.36;
    const left = this.#darkRatio(face.x + face.width * 0.18, eyeY, face.width * 0.25, face.height * 0.16);
    const right = this.#darkRatio(face.x + face.width * 0.57, eyeY, face.width * 0.25, face.height * 0.16);
    if (left === null || right === null) return null;
    const value = (left + right) / 2;
    this.#samples.push(value);
    if (this.#samples.length > 30) this.#samples.shift();
    return value;
  }

  #darkRatio(x, y, width, height) {
    const sx = Math.max(0, Math.floor(x));
    const sy = Math.max(0, Math.floor(y));
    const sw = Math.min(this.#canvas.width - sx, Math.max(1, Math.floor(width)));
    const sh = Math.min(this.#canvas.height - sy, Math.max(1, Math.floor(height)));
    if (sw < 2 || sh < 2) return null;
    const pixels = this.#ctx.getImageData(sx, sy, sw, sh).data;
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const luminance = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      if (luminance < 55) dark += 1;
    }
    return dark / (pixels.length / 4);
  }
}
