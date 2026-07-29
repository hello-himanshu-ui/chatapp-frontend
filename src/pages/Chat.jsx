import { useEffect, useState, useRef } from "react";
import API from "../services/api";
import socket from "../socket";
import EmojiPicker from "emoji-picker-react";
import {
  Search,
  Send,
  MessageCircle,
  Check,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Trash2,
  Sparkles,
  UserPlus,
  Loader2,
  X,
  LogOut,
} from "lucide-react";

function Chat() {
  const [contacts, setContacts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingContactId, setAddingContactId] = useState(null);
  const [deletingContactId, setDeletingContactId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [isSelectedUserTyping, setIsSelectedUserTyping] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load contacts & current user on page load
  useEffect(() => {
    fetchContacts();
    fetchCurrentUser();
  }, []);

  // Handle contact searching with backend call
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      handleSearch(search.trim());
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Load old messages
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      setOpenMenuId(null); // close any leftover delete menu from the previous chat
      setIsSelectedUserTyping(false); // reset typing indicator for the new chat
    }
  }, [selectedUser]);

  // Listen for realtime messages
  useEffect(() => {
    socket.on("receive_message", (message) => {
      if (!currentUser) return;

      const isCurrentChat =
        selectedUser &&
        ((message.sender === currentUser._id &&
          message.receiver === selectedUser._id) ||
          (message.sender === selectedUser._id &&
            message.receiver === currentUser._id));

      if (isCurrentChat) {
        // Message belongs to the open chat — just append it, no toast
        setMessages((prev) => [...prev, message]);
      } else if (message.receiver === currentUser._id) {
        // Message is for a different chat (or none open) AND the logged-in
        // user is the receiver — notify only in this case
        const senderName = message.senderInfo?.name || "New Message";
        showToast(senderName, message.text);
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, [selectedUser, currentUser]);

  // Realtime sidebar updates: unread badge, last message preview, reordering
  useEffect(() => {
    socket.on("conversation_update", async (payload) => {
      const exists = contacts.some((c) => c._id === payload.contactId);

      if (!exists) {
        await fetchContacts();
        return;
      }

      updateContactPreview(payload.contactId, {
        lastMessage: payload.lastMessage,
        lastMessageTime: payload.lastMessageAt,
        unreadCount: payload.unreadCount,
      });
    });

    return () => {
      socket.off("conversation_update");
    };
  }, []);

  // Realtime online / offline presence
  useEffect(() => {
    socket.on("user_online", (userId) => {
      setOnlineUserIds((prev) => new Set(prev).add(userId));
    });

    socket.on("user_offline", (userId) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.off("user_online");
      socket.off("user_offline");
    };
  }, []);

  // Realtime typing indicator, scoped to whichever chat is currently open
  useEffect(() => {
    socket.on("typing", ({ from }) => {
      if (selectedUser && from === selectedUser._id) {
        setIsSelectedUserTyping(true);
      }
    });

    socket.on("stop_typing", ({ from }) => {
      if (selectedUser && from === selectedUser._id) {
        setIsSelectedUserTyping(false);
      }
    });

    return () => {
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [selectedUser]);

  // Realtime seen-status
  useEffect(() => {
    socket.on("messages_seen", ({ seenBy }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === currentUser?._id &&
          msg.receiver === seenBy &&
          msg.status !== "seen"
            ? { ...msg, status: "seen" }
            : msg,
        ),
      );
    });

    return () => {
      socket.off("messages_seen");
    };
  }, [currentUser]);

  // Realtime edited messages
  useEffect(() => {
    socket.on("message_edited", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );
    });

    return () => {
      socket.off("message_edited");
    };
  }, []);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close the delete menu if the user clicks anywhere outside it
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Close emoji picker when clicking anywhere outside it
  useEffect(() => {
    const handleClickOutsideEmoji = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideEmoji);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideEmoji);
  }, []);

  // Reusable toast trigger
  const showToast = (title, message) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    if (!message) {
      setToastMessage({ title: "", message: title });
    } else {
      setToastMessage({ title, message });
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const updateContactPreview = (contactId, updates) => {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c._id === contactId);
      if (idx === -1) return prev;

      const updatedContact = { ...prev[idx], ...updates };
      const rest = prev.filter((c) => c._id !== contactId);
      return [updatedContact, ...rest];
    });
  };

  const fetchContacts = async () => {
    try {
      const res = await API.get("/users");
      setContacts(res.data);

      const onlineIds = res.data.filter((c) => c.isOnline).map((c) => c._id);
      setOnlineUserIds(new Set(onlineIds));
    } catch (error) {
      console.log(error);
    }
  };

  const handleSearch = async (searchTerm) => {
    setIsSearching(true);
    try {
      const res = await API.get(
        `/users/search?username=${encodeURIComponent(searchTerm)}`,
      );
      setSearchResults(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = async (user) => {
    if (addingContactId) return;
    setAddingContactId(user._id);

    try {
      await API.post("/users/add-contact", { contactId: user._id });
      showToast(`Added ${user.name} to contacts!`);
      await fetchContacts();
      setSearch("");
      setSearchResults([]);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to add contact");
    } finally {
      setAddingContactId(null);
    }
  };

  const handleRemoveContact = async (contactId, e) => {
    e.stopPropagation();
    if (deletingContactId === contactId) return;

    setDeletingContactId(contactId);

    try {
      await API.delete(`/users/delete-contact/${contactId}`);
      showToast("Contact removed successfully.");
      await fetchContacts();

      if (selectedUser?._id === contactId) {
        setSelectedUser(null);
      }
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to remove contact");
    } finally {
      setDeletingContactId(null);
    }
  };

  const isContactExist = (userId) => {
    return contacts.some((c) => c._id === userId);
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await API.get("/auth/me");
      setCurrentUser(res.data);
      socket.emit("join", res.data._id);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await API.get(`/messages/${selectedUser._id}`);
      setMessages(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);

    setContacts((prev) =>
      prev.map((c) => (c._id === user._id ? { ...c, unreadCount: 0 } : c)),
    );

    if (currentUser) {
      socket.emit("active_chat", {
        userId: currentUser._id,
        chatWith: user._id,
      });
    }

    try {
      await API.put(`/messages/mark-read/${user._id}`);
    } catch (error) {
      console.log(error);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !selectedUser) return;

    try {
      const res = await API.post("/messages/send", {
        receiver: selectedUser._id,
        text,
      });

      if (currentUser) {
        socket.emit("stop_typing", {
          to: selectedUser._id,
          from: currentUser._id,
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      setText("");
    } catch (error) {
      console.log(error);
    }
  };

  const deleteForMe = async (messageId) => {
    if (!messageId || deletingId === messageId) return;

    setDeletingId(messageId);

    try {
      await API.put(`/messages/deleteforme/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    } catch (error) {
      console.log(error);
    } finally {
      setOpenMenuId(null);
      setDeletingId(null);
    }
  };

  const handleEditMessage = async () => {
    if (!editingText.trim()) return;

    try {
      const res = await API.put(`/messages/edit/${editingMessageId}`, {
        text: editingText,
      });

      setMessages((prev) =>
        prev.map((msg) => (msg._id === editingMessageId ? res.data : msg)),
      );

      setEditingMessageId(null);
      setEditingText("");
    } catch (error) {
      console.log(error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (editingMessageId) {
        handleEditMessage();
      } else {
        sendMessage();
      }
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);

    if (!selectedUser || !currentUser) return;

    socket.emit("typing", { to: selectedUser._id, from: currentUser._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        to: selectedUser._id,
        from: currentUser._id,
      });
    }, 1500);
  };

  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleAiRewrite = async () => {
    if (!text.trim() || isRewriting) return;

    setIsRewriting(true);

    try {
      const res = await API.post("/ai/rewrite", { text });
      setText(res.data.reply);
    } catch (error) {
      console.log(error);
      alert(
        error.response?.data?.message || "AI Rewrite failed. Please try again.",
      );
    } finally {
      setIsRewriting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    socket.disconnect();
    window.location.href = "/";
  };

  const isUserOnline = (userId) => onlineUserIds.has(userId);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-screen w-full bg-[#0b0f19] text-slate-100 overflow-hidden relative font-sans antialiased selection:bg-violet-500/30 selection:text-violet-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-5 right-5 z-50 flex items-center gap-3 bg-[#131927]/90 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10 max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/25">
            <MessageCircle size={18} className="text-white" />
          </div>
          <div className="flex flex-col overflow-hidden text-left pr-2">
            {toastMessage.title && (
              <span className="text-xs font-semibold text-violet-300 truncate tracking-wide">
                💬 {toastMessage.title}
              </span>
            )}
            <span className="text-sm font-medium text-slate-200 truncate">
              {toastMessage.message}
            </span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-[340px] min-w-[340px] flex flex-col bg-[#0e1320]/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl z-20">
        {/* Logo */}
        <div className="flex items-center gap-3.5 px-6 py-5 border-b border-white/5 bg-white/[0.01]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-600/30 ring-1 ring-white/20">
            <MessageCircle size={20} className="text-white fill-white/10" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-200 via-slate-100 to-fuchsia-200 bg-clip-text text-transparent">
              ChatterBox
            </span>
            <span className="text-[11px] font-medium text-slate-400 tracking-wider uppercase">
              Messenger
            </span>
          </div>
        </div>

        {/* Logged in user */}
        {currentUser && (
          <div className="flex items-center gap-3.5 px-6 py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 flex items-center justify-center shadow-md ring-1 ring-white/10">
                <span className="text-sm font-bold text-white tracking-wider">
                  {getInitials(currentUser.name)}
                </span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0e1320] shadow-sm" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold truncate text-sm text-slate-100">
                {currentUser.name}
              </span>
              <span className="text-xs text-slate-400 truncate font-mono">
                {currentUser.username
                  ? `@${currentUser.username}`
                  : currentUser.email}
              </span>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-4 py-3.5 border-b border-white/5 relative">
          <label className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3.5 py-2.5 border border-white/5 transition-all duration-200 focus-within:bg-white/[0.07] focus-within:border-violet-500/40 focus-within:ring-1 focus-within:ring-violet-500/30">
            {isSearching ? (
              <Loader2
                size={17}
                className="text-violet-400 animate-spin shrink-0"
              />
            ) : (
              <Search size={17} className="text-slate-400 shrink-0" />
            )}
            <input
              type="text"
              className="grow bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-400 font-medium"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {/* Contacts / Search Results List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
          {search.trim() ? (
            <div>
              <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Search Results
              </div>
              {isSearching ? (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2.5 text-sm font-medium">
                  <Loader2 size={18} className="animate-spin text-violet-400" />
                  Searching users...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => {
                  const alreadyContact = isContactExist(user._id);
                  const isSelf = currentUser?._id === user._id;

                  return (
                    <div
                      key={user._id}
                      className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 my-1 shadow-sm"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shrink-0 border border-white/10">
                          <span className="text-xs font-bold text-slate-200">
                            {getInitials(user.name)}
                          </span>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-semibold truncate text-sm text-slate-100">
                            {user.name}
                          </span>
                          <span className="text-xs text-violet-400/90 truncate font-mono">
                            @{user.username || "username"}
                          </span>
                        </div>
                      </div>

                      {!isSelf && (
                        <button
                          onClick={() => handleAddContact(user)}
                          disabled={
                            alreadyContact || addingContactId === user._id
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 ${
                            alreadyContact
                              ? "bg-white/5 text-slate-400 cursor-not-allowed border border-white/5"
                              : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-md shadow-violet-600/20 active:scale-95"
                          }`}
                        >
                          {addingContactId === user._id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : alreadyContact ? (
                            <>
                              <Check size={13} />
                              Added
                            </>
                          ) : (
                            <>
                              <UserPlus size={13} />
                              Add
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-sm text-slate-400 mt-8 font-medium">
                  No user found with @{search}
                </p>
              )}
            </div>
          ) : contacts.length > 0 ? (
            contacts.map((user) => {
              const isSelected = selectedUser?._id === user._id;
              const online = isUserOnline(user._id);

              return (
                <div
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className={`group flex items-center gap-3.5 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-200 ease-out border ${
                    isSelected
                      ? "bg-gradient-to-r from-violet-600/25 via-purple-600/15 to-transparent border-violet-500/40 shadow-lg shadow-violet-950/30"
                      : "border-transparent hover:bg-white/[0.04] hover:border-white/5"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center border border-white/10 shadow-md group-hover:scale-105 transition-transform duration-200">
                      <span className="text-sm font-bold text-white tracking-wider">
                        {getInitials(user.name)}
                      </span>
                    </div>
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0e1320] shadow-sm" />
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold truncate text-sm text-slate-100 group-hover:text-white">
                        {user.name}
                      </h4>
                      {user.lastMessageTime && (
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          {formatTime(user.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-slate-400 truncate font-normal leading-relaxed">
                        {user.lastMessage
                          ? user.lastMessage
                          : user.username
                            ? `@${user.username}`
                            : ""}
                      </p>
                      {!!user.unreadCount && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shrink-0 shadow-md shadow-violet-500/30">
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleRemoveContact(user._id, e)}
                    disabled={deletingContactId === user._id}
                    title="Remove contact"
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 shrink-0"
                  >
                    {deletingContactId === user._id ? (
                      <Loader2
                        size={14}
                        className="animate-spin text-red-400"
                      />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <UserPlus size={22} />
              </div>
              <p className="text-sm text-slate-300 font-semibold">
                No contacts yet
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Search by username above to add friends and start messaging!
              </p>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="p-3 border-t border-white/5 bg-white/[0.01]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#0b0f19]">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#0e1320]/90 backdrop-blur-2xl border-b border-white/10 shadow-md z-10">
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center shadow-md border border-white/10">
                    <span className="text-sm font-bold text-white tracking-wider">
                      {getInitials(selectedUser.name)}
                    </span>
                  </div>
                  {isUserOnline(selectedUser._id) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0e1320] shadow-sm" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-base text-slate-100 tracking-tight">
                    {selectedUser.name}
                  </span>
                  <span
                    className={`text-xs font-medium tracking-wide ${
                      isSelectedUserTyping
                        ? "text-violet-400 animate-pulse"
                        : isUserOnline(selectedUser._id)
                          ? "text-emerald-400"
                          : "text-slate-400"
                    }`}
                  >
                    {isSelectedUserTyping
                      ? "typing..."
                      : isUserOnline(selectedUser._id)
                        ? "Online"
                        : "Offline"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                <button className="p-2.5 rounded-xl hover:text-violet-300 hover:bg-white/5 transition-all duration-200">
                  <Phone size={18} />
                </button>
                <button className="p-2.5 rounded-xl hover:text-violet-300 hover:bg-white/5 transition-all duration-200">
                  <Video size={19} />
                </button>
                <button className="p-2.5 rounded-xl hover:text-violet-300 hover:bg-white/5 transition-all duration-200">
                  <Search size={17} />
                </button>
                <button className="p-2.5 rounded-xl hover:text-violet-300 hover:bg-white/5 transition-all duration-200">
                  <MoreVertical size={19} />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div
              className="flex-1 overflow-y-auto px-8 py-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20"
              style={{
                background: `
    radial-gradient(circle at top left, rgba(139,92,246,0.12), transparent 35%),
    radial-gradient(circle at bottom right, rgba(59,130,246,0.10), transparent 35%),
    linear-gradient(180deg,#0b0f19,#111827,#0b0f19)
  `,
              }}
            >
              {messages.length > 0 ? (
                messages.map((msg, index) => {
                  const isMine = msg.sender === currentUser?._id;
                  const msgId = msg._id || index;

                  return (
                    <div
                      key={msgId}
                      className={`group relative flex items-start gap-2 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Menu trigger button for sent messages */}
                      {isMine && (
                        <div className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === msgId ? null : msgId,
                              );
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-white/5"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {openMenuId === msgId && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-full top-0 mr-2 z-30 w-38 rounded-xl bg-[#161d2f]/95 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden py-1"
                            >
                              <button
                                onClick={() => {
                                  setEditingMessageId(msg._id);
                                  setEditingText(msg.text);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center gap-2 w-full px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteForMe(msg._id)}
                                className="flex items-center gap-2 w-full px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                Delete for me
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`max-w-md px-4 py-3 rounded-2xl shadow-md ${
                          isMine
                            ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-none"
                            : "bg-[#161d2f] text-slate-100 rounded-bl-none border border-white/5"
                        }`}
                      >
                        <p className="text-sm font-normal leading-relaxed break-words">
                          {msg.text}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1 opacity-70">
                          <span className="text-[10px]">
                            {formatTime(msg.createdAt)}
                          </span>
                          {isMine && (
                            <span>
                              {msg.status === "seen" ? (
                                <CheckCheck size={13} className="text-sky-300" />
                              ) : (
                                <Check size={13} />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <MessageCircle size={40} className="text-violet-500/40" />
                  <p className="text-sm font-medium">
                    No messages yet. Say hi!
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#0e1320]/90 backdrop-blur-2xl border-t border-white/10 relative">
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-20 left-6 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10"
                >
                  <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors"
                >
                  <Smile size={20} />
                </button>
                <button className="p-2.5 rounded-xl text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors">
                  <Paperclip size={20} />
                </button>
                <button
                  onClick={handleAiRewrite}
                  disabled={isRewriting || !text.trim()}
                  className="p-2.5 rounded-xl text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-40"
                  title="Rewrite with AI"
                >
                  {isRewriting ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </button>

                <input
                  type="text"
                  value={editingMessageId ? editingText : text}
                  onChange={(e) =>
                    editingMessageId
                      ? setEditingText(e.target.value)
                      : handleTextChange(e)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={
                    editingMessageId
                      ? "Edit message..."
                      : "Type a message..."
                  }
                  className="flex-1 bg-white/[0.04] border border-white/5 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />

                {editingMessageId ? (
                  <button
                    onClick={() => {
                      setEditingMessageId(null);
                      setEditingText("");
                    }}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
                  >
                    <X size={18} />
                  </button>
                ) : null}

                <button
                  onClick={
                    editingMessageId ? handleEditMessage : sendMessage
                  }
                  disabled={
                    editingMessageId ? !editingText.trim() : !text.trim()
                  }
                  className="p-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-600/30 transition-all duration-200 disabled:opacity-40 active:scale-95"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-violet-400 shadow-xl">
              <MessageCircle size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">
              Select a contact to start chatting
            </h3>
            <p className="text-xs text-slate-400 max-w-xs text-center leading-relaxed">
              Choose someone from your sidebar or search for a username to begin a new conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;