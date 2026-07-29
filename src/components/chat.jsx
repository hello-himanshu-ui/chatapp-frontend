import { useEffect, useState } from "react";
import { socket } from "../socket";

function Chat({ username }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.off("receive_message");
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;

    socket.emit("send_message", {
      user: username,
      text: message,
    });

    setMessage("");
  };

  return (
    <div>
      {/* 👇 Yahan mera diya hua left-right message block paste hoga */}

      <div
        style={{
          height: "400px",
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "10px",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent:
                msg.user === username ? "flex-end" : "flex-start",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                backgroundColor:
                  msg.user === username ? "#DCF8C6" : "#FFFFFF",
                padding: "10px",
                borderRadius: "10px",
                maxWidth: "60%",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            >
              <strong>{msg.user}</strong>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default Chat;