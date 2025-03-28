'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, firestore } from '../../firebase/firebase'; // adjust path
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';

interface RoomDoc {
  id: string;
  hostUid: string;
  createdAt?: any; // or firebase.firestore.Timestamp
}

export default function FeedPage() {
  const router = useRouter();
  const [userUid, setUserUid] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomDoc[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // not logged in -> go home or login
        router.push('/');
      } else {
        setUserUid(user.uid);
        await loadFeed(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  async function loadFeed(uid: string) {
    // 1) get user doc to load `friends`
    const userRef = doc(firestore, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.log('No user doc found for this uid:', uid);
      return;
    }
    const userData = userSnap.data();
    // userData.friends might be an array of UIDs
    const friends: string[] = userData.friends || [];

    // 2) Query rooms where hostUid is either me or one of my friends
    // If you have many friends, be mindful that Firestore `where('hostUid','in',...)` 
    // can only handle up to 10 items in an 'in' clause. For bigger arrays, consider another approach.
    const hostUids = [...friends, uid]; // me + my friends
    if (hostUids.length === 0) {
      setRooms([]);
      return;
    }

    const roomsRef = collection(firestore, 'rooms');
    // Firestore supports 'in' with up to 10 values
    const q = query(roomsRef, where('hostUid', 'in', hostUids), orderBy('createdAt', 'desc'));

    onSnapshot(q, (snapshot) => {
      const newRooms: RoomDoc[] = [];
      snapshot.forEach((docSnap) => {
        newRooms.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setRooms(newRooms);
    });
  }

  async function createRoom() {
    if (!userUid) {
      alert('No user logged in');
      return;
    }
    try {
      const roomsRef = collection(firestore, 'rooms');
      const docRef = await addDoc(roomsRef, {
        hostUid: userUid,
        createdAt: serverTimestamp(),
      });
      // redirect to the watch page for the new room
      router.push(`/${docRef.id}/watch`);
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>My Feed</h1>
      <p>Shows rooms created by you or your friends.</p>

      <button onClick={createRoom} style={{ marginBottom: '1rem' }}>
        Create New Room
      </button>

      {rooms.map((room) => (
        <div
          key={room.id}
          style={{
            border: '1px solid #ccc',
            marginBottom: '1rem',
            padding: '0.5rem',
          }}
        >
          <p>Room ID: {room.id}</p>
          <p>Host UID: {room.hostUid}</p>
          <p>
            Created At:{' '}
            {room.createdAt
              ? new Date(room.createdAt.toDate()).toLocaleString()
              : '(no date)'}
          </p>
          <button onClick={() => router.push(`/${room.id}/watch`)}>
            Join Room
          </button>
        </div>
      ))}
    </div>
  );
}