import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';

// Live-reads the user's custom profile photo from Firestore (stored as
// base64 - this project is on the Spark plan, so Firebase Storage isn't
// available). Returns a data: URI ready for <Image source={{ uri }}>,
// or null if the user has no custom photo saved.
export function useProfilePhoto(uid: string | null | undefined): string | null {
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setPhotoDataUri(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      const base64 = snapshot.data()?.photoBase64;
      setPhotoDataUri(typeof base64 === 'string' ? `data:image/jpeg;base64,${base64}` : null);
    });

    return unsubscribe;
  }, [uid]);

  return photoDataUri;
}
