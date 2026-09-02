import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const AVATAR_MAX_DIMENSION = 256;
const AVATAR_JPEG_QUALITY = 0.7;

// Firestore's hard cap is 1 MiB (1,048,576 bytes) per document. Measured
// a 256px JPEG at this quality against both a flat-color logo and a
// synthetic high-entropy (worst-case) image - both landed under 25KB
// base64-encoded, far below this cap. This threshold is a generous
// safety margin, not a tight fit: if it's ever hit, something upstream
// is wrong (e.g. a much larger dimension slipping through), so we fail
// rather than risk writing a doc that could exceed Firestore's limit.
const MAX_ENCODED_BYTES = 300 * 1024;

// Resizes/compresses a locally-picked image and returns it as a base64
// string ready to store in Firestore. Throws if the result is
// unexpectedly large rather than risk exceeding Firestore's doc cap.
export async function prepareProfilePhoto(localUri: string): Promise<string> {
  const manipulated = await manipulateAsync(
    localUri,
    [{ resize: { width: AVATAR_MAX_DIMENSION } }],
    { compress: AVATAR_JPEG_QUALITY, format: SaveFormat.JPEG, base64: true }
  );

  if (!manipulated.base64) {
    throw new Error('Could not process the selected photo.');
  }

  if (manipulated.base64.length > MAX_ENCODED_BYTES) {
    throw new Error('Photo is too large to save. Please choose a different photo.');
  }

  return manipulated.base64;
}

// Persists the encoded photo on the user's Firestore document. Firestore
// writes are atomic (no partial/corrupt state) and this resolves once
// the write is durable, but there's no byte-level progress to report -
// unlike a Storage upload, this isn't a multi-chunk transfer.
export async function saveProfilePhoto(uid: string, base64: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { photoBase64: base64, photoUpdatedAt: Date.now() },
    { merge: true }
  );
}
