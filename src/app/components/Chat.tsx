'use client';

import React, { useEffect, useState } from 'react';
import { firestore } from '../../firebase/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface ChatProps {
  player: any;
}

export default function Chat({ player }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const q = query(collection(firestore, 'chat'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const msgs: any[] = [];
      snapshot.forEach(doc => msgs.push(doc.data()));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const videoTimestamp = player ? player.getCurrentTime() : 0;
    await addDoc(collection(firestore, 'chat'), {
      user: user?.uid ?? 'Guest',
      displayName: user?.displayName ?? 'Guest',
      text,
      timestamp: videoTimestamp,
      createdAt: serverTimestamp(),
    });
    setText('');
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Live Chat</h2>
      <div style={{ border: '1px solid #ccc', padding: 10, height: 200, overflowY: 'scroll' }}>
        {messages.map((msg, idx) => (
          <p
            key={idx}
            onClick={() => player?.seekTo(msg.timestamp, true)}
            style={{ cursor: 'pointer' }}
          >
            <strong>{msg.displayName ?? msg.user}</strong> [{msg.timestamp.toFixed(1)}s]: {msg.text}
          </p>
        ))}
      </div>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
        placeholder="Type your message"
        style={{ width: '80%', padding: '5px', marginTop: '10px' }}
      />
      <button onClick={sendMessage} style={{ marginLeft: '5px' }}>Send</button>
    </div>
  );
}