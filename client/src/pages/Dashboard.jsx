import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/icon.png";
import axios from "axios";
import { Share, X } from "lucide-react";
import { io } from "socket.io-client";
import RichTextEditor from "./RichTextEditor.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "", email: "" });
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState({});
  const [selectedNote, setSelectedNote] = useState(null);
  const [summary, setSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL.replace("/api", "");
  const updateTimeouts = useRef({});
  const socket = useRef(null);

  // --- Socket.io setup ---
  useEffect(() => {
    socket.current = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.current.on("connect", () => {
      console.log("✅ Connected to Socket.io:", socket.current.id);
    });

    socket.current.on("note-updated", ({ noteId, content }) => {
      // Update selected note if it matches
      if (selectedNote?._id === noteId) {
        setSelectedNote((prev) => (prev ? { ...prev, content } : prev));
      }
      setNotes((prev) =>
        prev.map((n) => (n._id === noteId ? { ...n, content } : n))
      );
    });

    return () => socket.current.disconnect();
  }, []);

  // Join note room when selectedNote changes
  useEffect(() => {
    if (selectedNote?._id && socket.current) {
      socket.current.emit("join-note", selectedNote._id);
    }
  }, [selectedNote?._id]);

  // --- Fetch user + notes ---
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const token = query.get("token") || localStorage.getItem("token");
    const name = query.get("name") || localStorage.getItem("name") || "Guest";
    const email = query.get("email") || localStorage.getItem("email") || "guest@example.com";
    const noteIdFromLink = query.get("noteId");

    if (!token) return navigate("/");

    localStorage.setItem("token", token);
    localStorage.setItem("name", name);
    localStorage.setItem("email", email);
    window.history.replaceState({}, document.title, "/dashboard");

    setUser({ name, email });
    fetchNotes(token, noteIdFromLink);
  }, []);

  const fetchNotes = async (authToken, noteIdFromLink) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setNotes(res.data);

      if (noteIdFromLink) {
        const note = res.data.find((n) => n._id === noteIdFromLink);
        if (note) setSelectedNote(note);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch notes. Please login again.");
      localStorage.clear();
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const openFullNote = (note) => {
    setSelectedNote(note);
    setSummary("");
  };

  const closeFullNote = () => setSelectedNote(null);

  const handleTitleChange = (e) => {
    const updated = { ...selectedNote, title: e.target.value };
    setSelectedNote(updated);
    handleUpdateNote(updated._id, updated);
  };

  const handleCreateNote = async () => {
    const authToken = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${API_URL}/api/notes`,
        { title: "New Note", content: "Write something here..." },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setNotes([res.data.note, ...notes]);
    } catch (err) {
      console.error(err);
      alert("Failed to create note.");
    }
  };

  const handleDeleteNote = async (id) => {
    const authToken = localStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setNotes(notes.filter((note) => note._id !== id));
      delete updateTimeouts.current[id];
      if (selectedNote?._id === id) setSelectedNote(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete note.");
    }
  };

  const handleUpdateNote = (id, updatedNote) => {
    if (updateTimeouts.current[id]) clearTimeout(updateTimeouts.current[id]);
    setSavingNotes((prev) => ({ ...prev, [id]: true }));

    updateTimeouts.current[id] = setTimeout(async () => {
      const authToken = localStorage.getItem("token");
      try {
        const res = await axios.put(`${API_URL}/api/notes/${id}`, updatedNote, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const savedNote = res.data.note || updatedNote;

        socket.current?.emit("edit-note", {
          noteId: savedNote._id,
          content: savedNote.content,
        });

        setNotes((prev) => prev.map((n) => (n._id === id ? savedNote : n)));
      } catch (err) {
        console.error(err);
        alert("Failed to update note.");
      } finally {
        setSavingNotes((prev) => ({ ...prev, [id]: false }));
      }
    }, 500);
  };

  const handleSummarizeNote = async () => {
    if (!selectedNote?.content) return;
    setAiLoading(true);
    try {
      const authToken = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/api/ai/summarize`,
        { text: selectedNote.content },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSummary(res.data.summary);
    } catch (err) {
      console.error(err);
      alert("Failed to summarize note");
    } finally {
      setAiLoading(false);
    }
  };
  

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar */}
      <header className="w-full bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Logo" className="h-8" />
        </div>
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-sm bg-blue-600  border-1 p-1 rounded-xl text-white hover: hover:bg-gray-500"
        >
          Sign out
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-8">
        <div className="bg-white shadow rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome, {user.name}! 🎉
          </h2>
        </div>

        <div className="mb-6">
          <button
            onClick={handleCreateNote}
            className="w-full md:w-auto bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          >
            + Create Note
          </button>
        </div>

        <h3 className="text-xl font-semibold text-gray-700 mb-4">Your Notes</h3>
        {loading ? (
          <p>Loading notes...</p>
        ) : notes.length === 0 ? (
          <p>No notes yet. Click "Create Note" to start.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {notes.map((note) => (
              <div
                key={note._id}
                className="bg-white shadow-md rounded-xl p-4 hover:shadow-xl transition flex flex-col justify-between"
              >
                <div
                  onClick={() => openFullNote(note)}
                  className="cursor-pointer flex-1"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-800 text-lg pr-2 truncate">
                      {note.title}
                    </h3>

                    {/* Share button */}

                    <div className="">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening full note
                          const textToCopy = `📝 *${note.title}*\n\n${
                            note.content || ""
                          }`;
                          navigator.clipboard
                            .writeText(textToCopy)
                            .then(() => alert("Note copied to clipboard 📋"))
                            .catch(() => alert("Failed to copy ❌"));
                        }}
                        className="bg-gray-100 text-gray-800 px-2 py-1 text-xs rounded-lg hover:bg-gray-300 transition"
                        title="Copy note to clipboard"
                      >
                        <Share size={14} className="text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note._id);
                        }}
                      >
                        <X size={13} className="mx-1" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-500 text-sm line-clamp-3">
                    {note.content || "No content yet..."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {/* Full Page Note Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 pt-10 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl h-full rounded-xl p-6 relative flex flex-col shadow-lg">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl"
              onClick={closeFullNote}
            >
              <X />
            </button>
            <input
              type="text"
              value={selectedNote.title}
              onChange={handleTitleChange}
              className="text-2xl font-bold mb-4 w-full border-b border-gray-300 focus:outline-none"
              placeholder="Note Title"
            />
            <RichTextEditor
              content={selectedNote.content}
              onChange={(value) => {
                const updated = { ...selectedNote, content: value };
                setSelectedNote(updated);
                handleUpdateNote(updated._id, updated);
              }}
            />

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={handleSummarizeNote}
                disabled={aiLoading}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
              >
                {aiLoading ? "Summarizing..." : "✨ Summarize Note"}
              </button>
              <button
                onClick={() => handleDeleteNote(selectedNote._id)}
                className=" self-end bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Delete Note
              </button>
              <button
                onClick={() => {
                  const shareLink = `${window.location.origin}/dashboard?noteId=${selectedNote._id}`;
                  navigator.clipboard
                    .writeText(shareLink)
                    .then(() => alert("Share link copied! 📋"))
                    .catch(() => alert("Failed to copy ❌"));
                }}
                className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                <Share size={16} className="text-gray-700" />
              </button>

              {summary && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-gray-700 whitespace-pre-line">{summary}</p>
                </div>
              )}
            </div>

            {savingNotes[selectedNote._id] && (
              <p className="text-xs text-gray-400 italic mt-2">Saving...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
