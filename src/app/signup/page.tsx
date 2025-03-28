'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, firestore } from '../../firebase/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const signUp = async () => {
    // 1) Check if username is taken
    const usernameRef = doc(firestore, 'usernames', username);
    const existingSnap = await getDoc(usernameRef);
    if (existingSnap.exists()) {
      alert('That username is already taken!');
      return;
    }

    try {
      // 2) Create the user with Email & Password
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // 3) Store the mapping in /usernames/:username => { email, uid }
      await setDoc(usernameRef, {
        email: cred.user.email,
        uid: cred.user.uid,
      });

      // 4) Create a doc in /users/:uid => { username, friends: [] }
      const userRef = doc(firestore, 'users', cred.user.uid);
      await setDoc(userRef, {
        username: username,
        friends: [],       // Initialize an empty friends array
        createdAt: new Date().toISOString(), // optional extra field
      });

      alert('Signup successful!');
      router.push('/'); // or /feed, or wherever
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '2rem' }}>
      <h2>Sign Up</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', marginBottom: '1rem' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: '1rem' }}
      />
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: '100%', marginBottom: '1rem' }}
      />

      <button onClick={signUp}>Sign Up</button>
    </div>
  );
}