import { createSignal, createEffect, Show } from "solid-js";
import { UserIcon } from "../components/chat/UserIcon";
import "../utils/listeners";

interface msgProps {
  id?: string;
  role: string;
  content: string;
  status?: string;
  prompt_eval_duration?: number;
}

const OLLAMA_API_URL = "http://localhost:11434/api/chat";
const LOCAL_STORAGE_KEY = "ollama_chat_history";

const SYSTEM_MODEL = "bippy/luna1";

const Chat = () => {
  const [messages, setMessages] = createSignal(
    JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]")
  );
  const [input, setInput] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

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

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const sendMessage = async () => {
    const userMessage = input().trim();
    if (!userMessage || isLoading()) return;

    setIsLoading(true);
    setError(null);

    const userMessageId = generateId("msg_");
    const assistantMessageId = generateId("msg_");

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

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            console.log(data);
            accumulatedText += data.message.content;
            setMessages((prev) =>
              prev.map((msg: msgProps) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: accumulatedText,
                      status: data.done ? "complete" : "pending",
                      prompt_eval_duration: data.done
                        ? data.prompt_eval_duration / 1000000000
                        : false,
                    }
                  : msg
              )
            );
          } catch (err) {
            console.error("Failed to parse chunk:", err);
          }
        }

        if (done) break;
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

  function generateId(suffix: string = "convo") {
    return `${suffix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }

  const exportAsJson = async () => {
    let messagesForExport = await messages().map((msg: msgProps) => {
      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        status: msg.status,
      };
    });

    const conversationTitleFetch = async () => {
      messagesForExport.push({
        role: "user",
        content:
          "Respond only with a title summarizing this conversation in eight words or less and with no special characters.",
      });
      try {
        const response = await fetch(OLLAMA_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: SYSTEM_MODEL,
            messages: messagesForExport,
            stream: false,
          }),
        });

        if (!response.ok) {
          throw new Error("Could not fetch title for some odd reason.");
        }

        const json = await response.json();
        return json.message.content;
      } catch (err) {
        console.error("Error getting title: ", err);
      }
    };

    const conversationTitle = await conversationTitleFetch();

    messagesForExport.unshift({
      username: "bippy",
      title: conversationTitle,
      dateCreated: "date",
      status: "begin",
    });

    messagesForExport.pop();
    messagesForExport.push({
      status: "end",
    });

    const blob = new Blob([JSON.stringify(messagesForExport)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generateId(conversationTitle.split(" ").join("_"))}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div class="dark:invert flex flex-col h-screen transition duration-1000 ease-in-out">
      <div class="flex flex-col h-full overflow-hidden">
        <div class="px-6 py-6 border-b flex justify-between items-center bg-neutral-100">
          <div class="flex items-center">
            <span class="text-6xl">
              <a
                href="./"
                class="hover:opacity-50 transition-opacity duration-500"
              >
                🌔
              </a>
            </span>
            <h1 class="text-3xl">Hi, I'm Luna.</h1>
          </div>
          <div>
            <button
              onClick={clearChat}
              class="text-xl px-3 py-1 mr-3 border border-neutral-100 hover:bg-neutral-300 transition-colors"
              title="Reset session"
            >
              <span class="dark:invert">🗑️</span>
            </button>
            <button
              onClick={exportAsJson}
              class="text-xl px-3 py-1 mr-3 border border-neutral-100 hover:bg-neutral-300 transition-colors"
              title="Export conversation as JSON"
            >
              <span class="dark:invert">🗃️</span>
            </button>
          </div>
        </div>

        {error() && (
          <div class="mx-4 mt-4 p-4 bg-red-500 text-white">
            <p>{error()}</p>
          </div>
        )}

        <div class="flex-grow overflow-y-auto pl-3 bg-neutral-50">
          {messages().map((message: msgProps) => (
            <div
              class={`flex mt-6 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
              id={message.id}
            >
              <span
                class="text-sm mr-3 cursor-pointer"
                title={message.role === "user" ? "bippy" : "Assistant"}
              >
                <UserIcon type={message.role} />
              </span>
              <div
                class={`max-w-[80%] py-3 px-6 pb-6 text-lg ${
                  message.role === "user"
                    ? "border-neutral-400 bg-neutral-100 border-l-8"
                    : "border-violet-900 bg-violet-100 border-l-8 text-black"
                }`}
              >
                <div class="whitespace-pre-wrap">
                  <Show
                    when={message.content}
                    fallback={
                      <span class="animate-ping text-neutral-500">...</span>
                    }
                  >
                    <Show
                      when={
                        message.prompt_eval_duration &&
                        message.prompt_eval_duration !== undefined
                      }
                    >
                      <p class="text-sm text-violet-500 mb-2">
                        Processed in{" "}
                        {message.prompt_eval_duration
                          ? Math.round(message.prompt_eval_duration * 100) / 100
                          : null}{" "}
                        seconds.
                      </p>
                    </Show>
                    <p class="mb-1">{message.content}</p>
                  </Show>
                </div>
                {message.status === "error" && (
                  <div class="text-red-500 uppercase text-sm mt-2">
                    Failed to get response.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div class="p-9 border-t bg-neutral-100">
          <div class="flex gap-2">
            <textarea
              id="user-input"
              class="flex-grow resize-none border text-lg p-3 focus:outline-none focus:ring-2 focus:ring-violet-900 min-h-[52px] max-h-[200px]"
              rows={1}
              value={input()}
              placeholder="Your message..."
              onInput={(e) => setInput(e.currentTarget.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading()}
            />
            <button
              onClick={sendMessage}
              class="bg-violet-900 hover:opacity-80 text-2xl text-white w-14 disabled:opacity-10 transition-opacity duration-500"
              disabled={isLoading()}
            >
              <div class={isLoading() ? "animate-spin" : ""}>
                {isLoading() ? "/" : "💬"}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
