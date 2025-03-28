'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, firestore } from '../firebase/firebase'; // adjust if needed
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const loginWithUsername = async () => {
    try {
      // 1) Look up email from the 'usernames' collection
      const usernameRef = doc(firestore, 'usernames', username);
      const snap = await getDoc(usernameRef);
      if (!snap.exists()) {
        alert('Username not found');
        return;
      }

      const { email } = snap.data() as { email: string };

      // 2) Sign in via email & password
      await signInWithEmailAndPassword(auth, email, password);

      alert('Logged in successfully!');
      // redirect to your watch page (or wherever you prefer)
      router.push('/feed');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const goToSignUp = () => {
    // navigate to /signup
    router.push('/signup');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#ffffff',
      }}
    >
      <h1
        style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          textAlign: 'center',
          color: '#000000',
        }}
      >
        STROAM
      </h1>

      <div
        style={{
          width: '400px',
          background: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
          color: '#000000',
        }}
      >
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            marginBottom: '1rem',
            padding: '0.5rem',
            fontSize: '1rem',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              loginWithUsername();
            }
          }}
          style={{
            width: '100%',
            marginBottom: '1rem',
            padding: '0.5rem',
            fontSize: '1rem',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={loginWithUsername}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              marginRight: '1rem',
              cursor: 'pointer',
              background: 'transparent',
              border: '1px solid #000000',
              color: '#000000',
            }}
          >
            Login
          </button>
          <button
            onClick={goToSignUp}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
              background: 'transparent',
              border: '1px solid #000000',
              color: '#000000',
            }}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}