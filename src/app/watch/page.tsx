'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { firestore } from '../../firebase/firebase';
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
  serverTimestamp
} from 'firebase/firestore';
import YouTube from 'react-youtube';
import Chat from '../components/Chat';

interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  timestamp: number;
  order: number;
}

export default function WatchPage() {
  const { user } = useAuth();
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ');
  const [input, setInput] = useState('');
  const [player, setPlayer] = useState<any>(null);
  const [sync, setSync] = useState({ isPlaying: false, timestamp: 0 });
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    return onSnapshot(doc(firestore, 'sync', 'video'), snap => {
      if (snap.exists()) setVideoId((snap.data() as any).videoId);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(doc(firestore, 'sync', 'playback'), snap => {
      if (snap.exists()) setSync(snap.data() as any);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(doc(firestore, 'sync', 'playback'), 'queue'), orderBy('order'));
    return onSnapshot(q, snap => {
      snap.docs.forEach(async d => {
        const data = d.data() as any;
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${data.videoId}`);
        const { title } = await res.json();
        setQueue(prev => {
          const without = prev.filter(i => i.id !== d.id);
          return [...without, { id: d.id, videoId: data.videoId, title: title || data.videoId, timestamp: data.timestamp, order: data.order }];
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!player) return;
    const curr = player.getCurrentTime();
    if (Math.abs(curr - sync.timestamp) > 1) player.seekTo(sync.timestamp, true);
    const state = player.getPlayerState();
    if (sync.isPlaying && state !== window.YT.PlayerState.PLAYING) player.playVideo();
    if (!sync.isPlaying && state === window.YT.PlayerState.PLAYING) player.pauseVideo();
  }, [player, sync]);

  const onReady = (e:any) => setPlayer(e.target);

  const changeVideo = async () => {
    const match = input.match(/(?:v=|\.be\/)([^&]+)/);
    if (!match) return alert('Invalid URL');
    await setDoc(doc(firestore, 'sync', 'video'), { videoId: match[1], updatedAt: serverTimestamp() });
    setInput('');
  };

  const enqueueVideo = async () => {
    const match = input.match(/(?:v=|\.be\/)([^&]+)/);
    if (!match) return alert('Invalid URL');
    const queueRef = collection(doc(firestore, 'sync', 'playback'), 'queue');
    await addDoc(queueRef, {
      videoId: match[1],
      timestamp: player?.getCurrentTime() ?? 0,
      order: Date.now(),
      createdAt: serverTimestamp()
    });
    setInput('');
  };

  const deleteQueue = async (id:string) => {
    await deleteDoc(doc(firestore, 'sync', 'playback', 'queue', id));
  };

  const moveQueue = async (i:number, dir:'up'|'down') => {
    const swapIndex = dir==='up'?i-1:i+1;
    if (swapIndex<0||swapIndex>=queue.length) return;
    const current=queue[i], target=queue[swapIndex];
    await updateDoc(doc(firestore, 'sync', 'playback', 'queue', current.id), { order: target.order });
    await updateDoc(doc(firestore, 'sync', 'playback', 'queue', target.id), { order: current.order });
  };

  const onEnd = async () => {
    if (!queue.length) return;
    const next = queue.sort((a,b)=>a.order-b.order)[0];
    await setDoc(doc(firestore, 'sync', 'video'), { videoId: next.videoId, updatedAt: serverTimestamp() });
    await deleteDoc(doc(firestore, 'sync', 'playback', 'queue', next.id));
  };

  if (!user) return <div>Please <a href="/login">login</a> first.</div>;

  return (
    <div style={{ display:'flex', padding:20 }}>
      <div style={{ flex:1 }}>
        <h1>Stroam Watch</h1>
        <div style={{ marginBottom:16 }}>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&changeVideo()}
            placeholder="Paste YouTube URL"
            style={{width:'60%',padding:8}}
          />
          <button onClick={changeVideo} style={{marginLeft:8}}>Change Video</button>
          <button onClick={enqueueVideo} style={{marginLeft:8}}>Add to Queue</button>
        </div>
        <YouTube videoId={videoId} onReady={onReady} onEnd={onEnd} opts={{width:640,height:390}}/>
        <Chat player={player}/>
      </div>
      <aside style={{width:300,marginLeft:20}}>
        <h3>Up Next</h3>
        {queue.sort((a,b)=>a.order-b.order).map((item,i)=>(
          <div key={item.id} style={{display:'flex',alignItems:'center',marginBottom:12}}>
            <img src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                 width={80} height={45} style={{cursor:'pointer'}} onClick={()=>player?.seekTo(item.timestamp,true)}/>
            <span style={{color:'#fff',flex:1}}>{item.title}</span>
            <button onClick={()=>moveQueue(i,'up')} disabled={i===0}>↑</button>
            <button onClick={()=>moveQueue(i,'down')} disabled={i===queue.length-1}>↓</button>
            <button onClick={()=>deleteQueue(item.id)} style={{marginLeft:8}}>✕</button>
          </div>
        ))}
      </aside>
    </div>
  );
}