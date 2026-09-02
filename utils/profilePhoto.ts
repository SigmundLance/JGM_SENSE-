import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebaseConfig';

const AVATAR_MAX_DIMENSION = 512;
const AVATAR_JPEG_QUALITY = 0.7;

// Resizes/compresses a locally-picked image, uploads it to
// users/{uid}/profile.jpg, and resolves with the public download URL.
// Does not touch Firebase Auth's photoURL - that's the caller's job,
// so a failed upload can never leave photoURL pointing at this (or any)
// local URI.
export async function uploadProfilePhoto(
  uid: string,
  localUri: string,
  onProgress?: (fraction: number) => void
): Promise<string> {
  const manipulated = await manipulateAsync(
    localUri,
    [{ resize: { width: AVATAR_MAX_DIMENSION } }],
    { compress: AVATAR_JPEG_QUALITY, format: SaveFormat.JPEG }
  );

  const response = await fetch(manipulated.uri);
  const blob = await response.blob();

  const storageRef = ref(storage, `users/${uid}/profile.jpg`);
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes);
      },
      reject,
      resolve
    );
  });

  return getDownloadURL(storageRef);
}
