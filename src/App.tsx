import { createSignal, createEffect, Show } from "solid-js";
import "./utils/listeners";

interface msgProps {
  id?: string;
  role: string;
  content: string;
  status?: string;
}

const OLLAMA_API_URL = "http://localhost:11434/api/chat";
const LOCAL_STORAGE_KEY = "ollama_chat_history";

const SYSTEM_MODEL = "bippy/luna1";

const App = () => {
  const [messages, setMessages] = createSignal(
    JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]")
  );
  const [input, setInput] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let textareaRef: any;

  // Save messages to localStorage
  createEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages()));
  });

  // Auto-scroll to the latest message
  createEffect(() => {
    const messagesContainer = document.querySelector(".flex-grow");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  // Auto-resize textarea
  createEffect(() => {
    if (textareaRef) {
      textareaRef.style.height = "0px";
      textareaRef.style.height = `${textareaRef.scrollHeight}px`;
    }
  });

  const generateMessageId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const sendMessage = async () => {
    const userMessage = input().trim();
    if (!userMessage || isLoading()) return;

    setIsLoading(true);
    setError(null);

    const userMessageId = generateMessageId();
    const assistantMessageId = generateMessageId();

    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        content: userMessage,
        status: "complete",
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        status: "pending",
      },
    ]);

    console.log(messages());

    setInput("");

    const conversationHistory = messages().map((msg: msgProps) => ({
      role: msg.role,
      content: msg.content,
    }));

    conversationHistory.push({ role: "user", content: userMessage });

    try {
      const response = await fetch(OLLAMA_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: SYSTEM_MODEL,
          messages: conversationHistory,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to get response reader");

      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              accumulatedText += data.message.content;
              setMessages((prev) =>
                prev.map((msg: msgProps) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: accumulatedText,
                        status: data.done ? "complete" : "pending",
                      }
                    : msg
                )
              );
            }
          } catch (err) {
            console.error("Failed to parse chunk:", err);
          }
        }
      }

      setIsLoading(false);
    } catch (err: unknown) {
      console.error("Failed to send message:", err);
      err instanceof Error
        ? setError(err.message || "Failed to fetch response")
        : false;
      setIsLoading(false);

      setMessages((prev) =>
        prev.map((msg: msgProps) =>
          msg.id === assistantMessageId ? { ...msg, status: "error" } : msg
        )
      );
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportAsJson = () => {
    const messagesForExport = JSON.stringify(messages());
    const blob = new Blob([messagesForExport], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "conversation.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  function extractCodeBlock(message: string, language = "javascript") {
    const regex = new RegExp(`\`\`\`${language}\\s*([\\s\\S]*?)\`\`\``);
    const match = message.match(regex);
    console.log(match);
    return match ? match[1].trim() : null;
  }

  function formatMsg(message: string) {
    if (message.includes("```")) {
      var code = extractCodeBlock(message);

      return (
        <>
          <div class="bg-slate-100 border-slate-200 border my-3">
            <div class="bg-slate-200 px-3 py-1 text-slate-400">javascript</div>
            <div class="px-3 py-1">{code}</div>
            <div class="px-3 py-3">
              <button class="px-6 py-1 text-slate-400 bg-slate-200 rounded border">
                Copy
              </button>
            </div>
          </div>
          {message}
        </>
      );
    }
    return message;
  }

  return (
    <div class="flex flex-col h-screen">
      <div class="flex flex-col h-full overflow-hidden">
        <div class="py-3 border-b flex justify-between items-center bg-white">
          <div class="flex items-center">
            <span class="text-6xl"><a href="./">🌔</a></span><h1 class="text-3xl">Hi, I'm Luna.</h1>
          </div>
          <div>
            <button
              onClick={clearChat}
              class="text-xl px-3 py-1 mr-3 border border-gray-100 rounded hover:bg-gray-100 transition-colors"
              title="Reset session"
            >
              🗑️
            </button>
            <button
              onClick={exportAsJson}
              class="text-xl px-3 py-1 mr-3 border border-gray-100 rounded hover:bg-gray-100 transition-colors"
              title="Export conversation as JSON"
            >
              🗃️
            </button>
          </div>
        </div>

        {error() && (
          <div class="mx-4 mt-4 p-4 bg-red-500 text-white rounded-lg">
            <p>{error()}</p>
          </div>
        )}

        <div class="flex-grow overflow-y-auto px-3 bg-gray-50">
          {messages().map((message: msgProps) => (
            <div
              class={`flex mt-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
              id={message.id}
            >
              <span class="text-3xl">
                <Show when={message.role === "user"} fallback={<>🌔</>}>
                  👤
                </Show>
              </span>
              <div
                class={`max-w-[80%] py-3 px-6 rounded-xl ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white"
                }`}
              >
                <div class="whitespace-pre-wrap">
                  <Show
                    when={message.content}
                    fallback={
                      <span class="animate-ping text-gray-500">...</span>
                    }
                  >
                    {formatMsg(message.content)}
                  </Show>
                </div>
                {message.status === "error" && (
                  <div class="text-red-500 uppercase text-sm mt-2">
                    Failed to get response
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div class="p-4 border-t bg-white">
          <div class="flex gap-2">
            <textarea
              id="user-input"
              ref={textareaRef}
              class="flex-grow resize-none border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[52px] max-h-[200px]"
              rows={1}
              value={input()}
              placeholder="Type a message..."
              onInput={(e) => setInput(e.currentTarget.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading()}
            />
            <button
              onClick={sendMessage}
              class="bg-blue-500 text-white rounded-lg px-4 py-2 disabled:opacity-50"
              disabled={isLoading()}
            >
              {isLoading() ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
