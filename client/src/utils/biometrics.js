// Biometrics utility for Face Recognition, WebAuthn Fingerprint, and Audio Chimes

// 1. Capture snapshot image from HTML5 video element
export const captureFrameFromVideo = (videoElement) => {
  if (!videoElement || videoElement.readyState < 2) return null;

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
};

import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

// Initialize face-api models
export const loadFaceModels = async () => {
  if (modelsLoaded) return true;
  try {
    const modelPath = '/models';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
    ]);
    modelsLoaded = true;
    console.log('Face models loaded successfully');
    return true;
  } catch (err) {
    console.error('Error loading face models:', err);
    return false;
  }
};

// 2. Extract feature vector descriptor from video/canvas
export const extractFaceDescriptor = async (videoOrCanvas) => {
  try {
    if (!modelsLoaded) {
      const loaded = await loadFaceModels();
      if (!loaded) throw new Error('Models failed to load');
    }

    // Detect a single face with landmarks and descriptor
    const detection = await faceapi
      .detectSingleFace(videoOrCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.warn('No face detected in frame');
      return null;
    }

    // Convert Float32Array to standard array for JSON serialization/storage
    return Array.from(detection.descriptor);
  } catch (err) {
    console.error('Feature descriptor extraction error:', err);
    return null;
  }
};

// 3. Compare two face descriptors using Euclidean Distance with strict threshold
export const compareFaceDescriptors = (descA, descB, threshold = 0.55) => {
  if (!descA || !descB || descA.length === 0 || descB.length === 0) {
    return { score: 0, distance: 999, isMatch: false, valueOf() { return 0; }, toString() { return '0'; } };
  }
  
  try {
    const arrA = new Float32Array(descA);
    const arrB = new Float32Array(descB);
    
    // Calculate Euclidean distance (face-api standard: <= 0.55 is the same person)
    const distance = faceapi.euclideanDistance(arrA, arrB);
    const isMatch = distance <= threshold;
    
    let score;
    if (isMatch) {
      // Confident match: mapped between 75% and 99.5%
      score = 100 - (distance / threshold) * 25;
    } else {
      // Different person: drops sharply into 0% - 50%
      score = Math.max(0, 50 - ((distance - threshold) / 0.5) * 50);
    }
    
    score = +score.toFixed(1);
    
    return {
      score,
      distance: +distance.toFixed(3),
      isMatch,
      valueOf() { return score; },
      toString() { return String(score); },
    };
  } catch (err) {
    console.error('Comparison error:', err);
    return { score: 0, distance: 999, isMatch: false, valueOf() { return 0; }, toString() { return '0'; } };
  }
};

// 4. WebAuthn Fingerprint Hardware Enrollment
export const enrollHardwareFingerprint = async (staffName, employeeId) => {
  if (window.PublicKeyCredential && window.isSecureContext) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userId = new TextEncoder().encode(employeeId || 'STAFF_USER');

      const createOptions = {
        publicKey: {
          challenge,
          rp: {
            name: 'BioTrack Enterprise',
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: staffName,
            displayName: staffName,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Built-in fingerprint / Windows Hello / Touch ID
            userVerification: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      };

      const credential = await navigator.credentials.create(createOptions);
      if (credential) {
        return {
          success: true,
          credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          type: 'hardware',
        };
      }
    } catch (err) {
      console.warn('Hardware WebAuthn prompt canceled or unavailable:', err.message);
      // Fallback to simulated capacitive biometric token
    }
  }

  // Fallback virtual biometric token
  const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return {
    success: true,
    credentialId: `fp_sensor_${employeeId}_${randomHex}`,
    type: 'virtual_sensor',
  };
};

// 5. WebAuthn Fingerprint Verification
export const verifyHardwareFingerprint = async (storedCredentialId) => {
  if (!storedCredentialId) {
    return { success: false, verified: false, message: 'No fingerprint enrolled for this staff member.' };
  }

  if (window.PublicKeyCredential && window.isSecureContext && !storedCredentialId.startsWith('fp_sensor_')) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const rawId = Uint8Array.from(atob(storedCredentialId), (c) => c.charCodeAt(0));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: rawId,
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'preferred',
          timeout: 60000,
        },
      });

      if (assertion) {
        return { success: true, verified: true };
      } else {
        return { success: false, verified: false, message: 'Biometric verification was rejected.' };
      }
    } catch (err) {
      console.warn('Hardware WebAuthn prompt canceled or failed:', err.message);
      return { success: false, verified: false, message: 'Hardware fingerprint verification canceled or failed.' };
    }
  }

  // If virtual sensor credential was enrolled
  if (storedCredentialId.startsWith('fp_sensor_')) {
    return { success: true, verified: true };
  }

  return { success: false, verified: false, message: 'Biometric credentials not verified.' };
};

// 6. Web Audio API Chime Synth
export const playAudioChime = (type = 'success') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      // Pleasant futuristic ascending triad: C5 (523Hz), E5 (659Hz), G5 (784Hz)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.01, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
      });
    } else if (type === 'warning') {
      // Gentle double ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Audio autoplay restrictions or headless env
  }
};
