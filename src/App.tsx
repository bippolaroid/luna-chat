import { createSignal, createEffect, Show } from "solid-js";

interface msgProps {
  id?: string;
  role: string;
  content: string;
  status?: string;
}

const OLLAMA_API_URL = "http://localhost:11434/api";
const LOCAL_STORAGE_KEY = "ollama_chat_history";

const SYSTEM_MODEL = "bippy/mav";

const App = () => {
  const [messages, setMessages] = createSignal(
    JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]")
  );
  const [input, setInput] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [isSystemPrompt, setIsSystemPrompt] = createSignal(false);
  const [systemInput, setSystemInput] = createSignal("");

  let messagesEndRef;
  let textareaRef: any;

  createEffect(() => {
    if (isSystemPrompt()) {
      var systemPrompt = document.getElementById("system-prompt");
      systemPrompt?.focus();
    }
  });

  // Save messages to localStorage whenever they change
  createEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages()));
  });

  // Auto-scroll to bottom when messages change
  createEffect(() => {
    const messagesContainer = document.querySelector(".flex-grow");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  // Auto-resize textarea based on content
  createEffect(() => {
    if (textareaRef) {
      textareaRef.style.height = "0px";
      textareaRef.style.height = `${textareaRef.scrollHeight}px`;
    }
  });

  const generateMessageId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const sendMessage = async () => {
    const userMessage = input().trim();
    if (!userMessage || isLoading()) return;

    try {
      setIsLoading(true);
      setError(null);

      // Add user message
      const userMessageId = generateMessageId();
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: "user",
          content: userMessage,
          status: "complete",
        },
      ]);

      // Add assistant placeholder
      const assistantMessageId = generateMessageId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          status: "pending",
        },
      ]);

      setInput("");

      // Prepare conversation history for context
      const conversationHistory = messages().map((msg: msgProps) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add current message
      conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      // Make streaming request to Ollama chat API
      const response = await fetch(`${OLLAMA_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: SYSTEM_MODEL,
          messages: conversationHistory,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

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

            if (data.done) {
              setIsLoading(false);
            }
          } catch (err) {
            console.error("Failed to parse chunk:", err);
          }
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(null);
      setIsLoading(false);

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === "assistant" && lastMsg.status === "pending") {
          return prev.map((msg: msgProps) =>
            msg.id === lastMsg.id ? { ...msg, status: "error" } : msg
          );
        }
        return prev;
      });
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  document.addEventListener("keydown", (e) => {
    if (e.key !== "`" && !isSystemPrompt()) {
      document.getElementById("user-prompt")?.focus();
    }
    if (e.key === "`") {
      setIsSystemPrompt(true);
    }
    if (e.key === "Escape" || e.key === "Enter") {
      setIsSystemPrompt(false);
    }
  });

  return (
    <div class="flex flex-col h-screen max-w-4xl mx-auto p-4 space-y-4">
      <div class="flex flex-col h-full border border-gray-300 rounded-lg shadow-md overflow-hidden">
        <div class="p-4 border-b flex justify-between items-center bg-white">
          <h1 class="text-lg">🌔 Hello. I'm Luna.</h1>
          <h2 class="text-sm font-bold">What can I help you with?</h2>
          <button
            onClick={clearChat}
            class="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            title="Clear chat history"
          >
            🗑️
          </button>
        </div>

        {error() && (
          <div class="mx-4 mt-4 p-4 bg-red-500 text-white rounded-lg">
            <p>{error()}</p>
          </div>
        )}

        <div class="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages().map((message: msgProps) => (
            <div
              class={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
              id={message.id}
            >
              <div
                class={`max-w-[80%] p-4 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white"
                }`}
              >
                <div class="whitespace-pre-wrap">
                  <strong>
                    <Show
                      when={message.role === "user"}
                      fallback={<>Assistant:&nbsp;</>}
                    >
                      User:&nbsp;
                    </Show>
                  </strong>
                  <Show when={message.content} fallback={<b>...</b>}>
                    {message.content}
                  </Show>
                </div>
                {message.status === "error" && (
                  <div class="text-red-500 text-sm mt-2">
                    Failed to get response
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div class="p-4 border-t bg-white">
          <div class="flex gap-2">
            <textarea
              id="user-prompt"
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
      <Show when={isSystemPrompt()}>
        <div class="w-full font-bold rounded-lg shadow-md bg-red-700 text-white px-3 py-1">
          SYSTEM PROMPT{" "}
          <input
            id="system-prompt"
            type="text"
            class="bg-transparent w-full font-normal outline-none"
            onInput={(e) => setSystemInput(e.currentTarget.value)}
          />
        </div>
      </Show>
    </div>
  );
};

export default App;
