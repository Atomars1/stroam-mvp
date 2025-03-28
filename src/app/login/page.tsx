'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../firebase/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/feed');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const signUp = async () => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, {
        displayName: email.split('@')[0],
      });
      router.push('/feed');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '2rem' }}>
      <h2>Login / Sign Up</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', marginBottom: '1rem' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: '1rem' }}
      />
      <div>
        <button onClick={signIn} style={{ marginRight: '1rem' }}>
          Login
        </button>
        <button onClick={signUp}>Sign Up</button>
      </div>
    </div>
  );
}