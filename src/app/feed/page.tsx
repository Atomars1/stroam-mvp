'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, firestore } from '../../firebase/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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
  createdAt?: any;
  hostName?: string;
  hostAvatar?: string;
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  createdAt?: any;
}

export default function FeedPage() {
  const router = useRouter();

  // User info
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  // Feed data
  const [friendRooms, setFriendRooms] = useState<RoomDoc[]>([]);
  const [trendingRooms, setTrendingRooms] = useState<RoomDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown state for user avatar
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Search text state
  const [searchTerm, setSearchTerm] = useState('');

  // Active comment box state (room id that has comment box open)
  const [activeCommentRoom, setActiveCommentRoom] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Add this state near your existing state declarations:
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/');
      } else {
        setUserUid(user.uid);
        await loadUserProfile(user.uid);
        await loadFriendsFeed(user.uid);
        await loadNotifications(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  async function loadUserProfile(uid: string) {
    const userRef = doc(firestore, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.avatarUrl) setUserAvatar(data.avatarUrl);
      if (data.displayName) setDisplayName(data.displayName);
    }
  }

  async function loadFriendsFeed(uid: string) {
    const userRef = doc(firestore, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.log('No user doc found for:', uid);
      setFriendRooms([]);
      return;
    }
    const userData = userSnap.data();
    const friends: string[] = userData.friends || [];
    const hostUids = [...friends, uid];

    if (hostUids.length === 0) {
      setFriendRooms([]);
      return;
    }

    const roomsRef = collection(firestore, 'rooms');
    const roomsQuery = query(
      roomsRef,
      where('hostUid', 'in', hostUids),
      orderBy('createdAt', 'desc')
    );
    onSnapshot(roomsQuery, async (snap) => {
      const fetched: RoomDoc[] = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as any;
        const room: RoomDoc = {
          id: docSnap.id,
          hostUid: data.hostUid,
          createdAt: data.createdAt,
        };
        try {
          const hostRef = doc(firestore, 'users', data.hostUid);
          const hostSnap = await getDoc(hostRef);
          if (hostSnap.exists()) {
            const hd = hostSnap.data();
            room.hostName = hd.username || data.hostUid;
            if (hd.avatarUrl) room.hostAvatar = hd.avatarUrl;
          } else {
            room.hostName = data.hostUid;
          }
        } catch {
          room.hostName = data.hostUid;
        }
        fetched.push(room);
      }
      setFriendRooms(fetched);
    });
  }

  async function loadNotifications(uid: string) {
    // Notifications now load into state but their display is solely via the dropdown.
    const notificationsRef = collection(doc(firestore, 'users', uid), 'notifications');
    const notifQuery = query(notificationsRef, orderBy('createdAt', 'desc'));
    onSnapshot(notifQuery, (snap) => {
      const items: NotificationItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        items.push({
          id: d.id,
          type: data.type,
          message: data.message,
          createdAt: data.createdAt,
        });
      });
      setNotifications(items);
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
      router.push(`/${docRef.id}/watch`);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.push('/');
  }

  // Placeholder function for posting a comment (timestamped comment functionality)
  function postComment(roomId: string) {
    console.log(`Posting comment for room ${roomId}: ${commentText}`);
    // Reset comment box after posting
    setCommentText('');
    setActiveCommentRoom(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <p>Loading feed...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1
              className="text-2xl font-bold text-red-500 cursor-pointer drop-shadow-md"
              onClick={() => router.push('/feed')}
            >
              Stroam
            </h1>
            <nav className="hidden md:flex space-x-4">
              <a href="/feed" className="text-gray-700 hover:text-red-500">
                Feed
              </a>
              <a href="/explore" className="text-gray-700 hover:text-red-500">
                Explore
              </a>
              <a href="/rooms" className="text-gray-700 hover:text-red-500">
                Rooms
              </a>
              <a href="/profile" className="text-gray-700 hover:text-red-500">
                Profile
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-100 placeholder-gray-500 text-black rounded-full pl-4 pr-4 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
              />
            </div>
            {/* User Avatar with Dropdown */}
            <div
              className="relative inline-block"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border border-gray-300 cursor-pointer shadow"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center border border-gray-300 cursor-pointer shadow">
                  <span className="text-xs">NA</span>
                </div>
              )}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg transition-transform duration-200 ease-out"
                  style={{ animation: 'dropdown 200ms ease-out forwards' }}
                >
                  <ul className="list-none m-0 p-0">
                    <li
                      onClick={() => router.push('/profile')}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                    >
                      View Profile
                    </li>
                    <li
                      onClick={() => router.push('/friends')}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                    >
                      Friends List
                    </li>
                    <li
                      onClick={() => router.push('/settings')}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                    >
                      Settings
                    </li>
                    <li
                      onClick={() => router.push('/watch-history')}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                    >
                      Watch History
                    </li>
                    <li
                      onClick={() => router.push('/saved')}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                    >
                      Saved Content
                    </li>
                    <li
                      onClick={handleLogout}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      Logout
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Create Room Section */}
        <div className="bg-white border border-gray-200 rounded p-4 shadow mb-6">
          <div className="flex items-center space-x-4 mb-4">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover border border-gray-300 shadow"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center border border-gray-300 shadow">
                <span className="text-xs">NA</span>
              </div>
            )}
            <input
              type="text"
              placeholder="What are you watching?"
              className="flex-1 bg-gray-100 rounded-full pl-4 py-2 placeholder-gray-500 text-black focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
            />
          </div>
          <button
            onClick={createRoom}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow"
          >
            + Create Room
          </button>
        </div>

        {/* Feed Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Feed</h2>
          {friendRooms.length === 0 ? (
            <p className="text-gray-500">No active rooms among your network.</p>
          ) : (
            <div className="space-y-4">
              {friendRooms.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row items-start gap-4 p-4 border rounded bg-white shadow"
                >
                  <div className="flex items-center gap-4">
                    {r.hostAvatar ? (
                      <img
                        src={r.hostAvatar}
                        alt={r.hostName || 'Host'}
                        className="w-16 h-16 rounded-full object-cover border border-gray-300 shadow"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center border border-gray-300 shadow">
                        <span className="text-xs">No Avatar</span>
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-medium">Host: {r.hostName || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">Room ID: {r.id}</p>
                      <p className="text-sm text-gray-400">
                        Created:{' '}
                        {r.createdAt
                          ? new Date(r.createdAt.toDate()).toLocaleString()
                          : '(no date)'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    <button className="flex items-center space-x-1 text-gray-700 hover:text-red-500 transition">
                      <span>❤️</span>
                      <span>12</span>
                    </button>
                    <button
                      onClick={() =>
                        setActiveCommentRoom(activeCommentRoom === r.id ? null : r.id)
                      }
                      className="flex items-center space-x-1 text-gray-700 hover:text-red-500 transition"
                    >
                      <span>💬</span>
                      <span>Comment</span>
                    </button>
                    <button
                      onClick={() => router.push(`/${r.id}/watch`)}
                      className="flex items-center space-x-1 border rounded px-3 py-1 text-red-500 hover:bg-red-50 transition"
                    >
                      <span>▶️</span>
                      <span>Join</span>
                    </button>
                  </div>
                  {activeCommentRoom === r.id && (
                    <div className="mt-4">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Type your comment with timestamp..."
                        className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      ></textarea>
                      <button
                        onClick={() => postComment(r.id)}
                        className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                      >
                        Post Comment
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      {/* Right Side Events Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50"
        onMouseEnter={() => setIsSidePanelOpen(true)}
        onMouseLeave={() => setIsSidePanelOpen(false)}
      >
        {/* The container is 340px wide: 300px for the panel and 40px for the handle */}
        <div
          className="absolute top-0 h-full transition-all duration-300 ease-in-out w-[340px] border-l border-gray-200 bg-white shadow-lg"
          style={{ right: isSidePanelOpen ? '0' : '-300px' }}
        >
          {/* Main Panel Content (300px) */}
          <div className="float-left w-[300px] h-full bg-white">
            <h2 className="text-xl font-semibold p-4 border-b">Upcoming Events</h2>
            <ul className="p-4 space-y-2">
              {/* Replace with dynamic event data as needed */}
              <li className="text-gray-700">No upcoming events</li>
            </ul>
          </div>
          {/* Handle (40px) */}
          <div className="float-left w-[40px] h-full bg-gray-600 flex items-center justify-center">
            <span className="rotate-90 text-xs text-white">Events</span>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes dropdown {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}