'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/app/components/AuthContext';
import { firestore } from '@/app/firebase/firebase';
import {
  doc,
  collection,
  onSnapshot,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import YouTube from 'react-youtube';
import Chat from '@/app/components/Chat';

interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  timestamp: number;
  order: number;
}

export default function WatchPage() {
  const { room } = useParams() as { room: string };
  const { user } = useAuth();
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ');
  const [input, setInput] = useState('');
  const [player, setPlayer] = useState<any>(null);
  const [syncData, setSyncData] = useState({ isPlaying: false, timestamp: 0 });
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const videoDoc = doc(firestore, 'sync', room, 'video');
  const playbackDoc = doc(firestore, 'sync', room, 'playback');
  const queueCol = collection(playbackDoc, 'queue');

  useEffect(() => onSnapshot(videoDoc, snap => {
    if (snap.exists()) setVideoId((snap.data() as any).videoId);
  }), [room]);

  useEffect(() => onSnapshot(playbackDoc, snap => {
    if (snap.exists()) setSyncData(snap.data() as any);
  }), [room]);

  useEffect(() => {
    const q = query(queueCol, orderBy('order'));
    return onSnapshot(q, snap => setQueue(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))));
  }, [room]);

  useEffect(() => {
    if (!player) return;
    const curr = player.getCurrentTime();
    if (Math.abs(curr - syncData.timestamp) > 1) player.seekTo(syncData.timestamp, true);
    const state = player.getPlayerState();
    if (syncData.isPlaying && state !== window.YT.PlayerState.PLAYING) player.playVideo();
    if (!syncData.isPlaying && state === window.YT.PlayerState.PLAYING) player.pauseVideo();
  }, [player, syncData]);

  const onReady = (e: any) => setPlayer(e.target);

  const changeVideo = async () => {
    const id = input.match(/(?:v=|\.be\/)([^&]+)/)?.[1];
    if (!id) return alert('Invalid YouTube URL');
    await setDoc(videoDoc, { videoId: id, updatedAt: serverTimestamp() });
    setInput('');
  };

  const enqueueVideo = async () => {
    const id = input.match(/(?:v=|\.be\/)([^&]+)/)?.[1];
    if (!id) return alert('Invalid YouTube URL');
    await addDoc(queueCol, {
      videoId: id,
      timestamp: player?.getCurrentTime() ?? 0,
      order: Date.now(),
      createdAt: serverTimestamp(),
    });
    setInput('');
  };

  const deleteQueue = async (id: string) => {
    await deleteDoc(doc(queueCol, id));
  };

  const moveQueue = async (i: number, dir: 'up' | 'down') => {
    const swap = dir === 'up' ? i - 1 : i + 1;
    if (swap < 0 || swap >= queue.length) return;
    const curr = queue[i];
    const tgt = queue[swap];
    await updateDoc(doc(queueCol, curr.id), { order: tgt.order });
    await updateDoc(doc(queueCol, tgt.id), { order: curr.order });
  };

  const onEnd = async () => {
    if (!queue.length) return;
    const next = queue.sort((a, b) => a.order - b.order)[0];
    await setDoc(videoDoc, { videoId: next.videoId, updatedAt: serverTimestamp() });
    await deleteDoc(doc(queueCol, next.id));
  };

  if (!user) return <div>Please <a href="/login">login</a> first.</div>;

  return (
    <div style={{ display: 'flex', padding: 20 }}>
      <div style={{ flex: 1 }}>
        <h1>Room: {room}</h1>
        <div style={{ marginBottom: 16 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && changeVideo()}
            placeholder="Paste YouTube URL"
            style={{ width: '60%', padding: 8 }}
          />
          <button onClick={changeVideo} style={{ marginLeft: 8 }}>Change Video</button>
          <button onClick={enqueueVideo} style={{ marginLeft: 8 }}>Add to Queue</button>
        </div>
        <YouTube videoId={videoId} onReady={onReady} onEnd={onEnd} opts={{ width: 640, height: 390 }} />
        <Chat player={player} />
      </div>
      <aside style={{ width: 300, marginLeft: 20 }}>
        <h3>Up Next</h3>
        {queue.sort((a, b) => a.order - b.order).map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <img
              src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
              width={80} height={45}
              style={{ cursor: 'pointer', marginRight: 8 }}
              onClick={() => player?.seekTo(item.timestamp, true)}
            />
            <span style={{ flex: 1 }}>{item.title}</span>
            <button onClick={() => moveQueue(idx, 'up')} disabled={idx === 0}>↑</button>
            <button onClick={() => moveQueue(idx, 'down')} disabled={idx === queue.length - 1}>↓</button>
            <button onClick={() => deleteQueue(item.id)} style={{ marginLeft: 8 }}>✕</button>
          </div>
        ))}
      </aside>
    </div>
  );
}