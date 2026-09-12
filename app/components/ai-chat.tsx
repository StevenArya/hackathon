"use client";

import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestedQuestions = [
  "Which customers should I contact today?",
  "Who has the highest credit risk?",
  "Summarise all overdue invoices.",
  "How much money is currently outstanding?",
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm Invora AI. Ask me about your customers, invoices, outstanding balances, or credit risk.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(messageText?: string) {
    const text = messageText ?? input.trim();

    if (!text || loading) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: text,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          messages: updatedMessages.filter(
            (message, index) =>
              !(
                index === 0 &&
                message.role === "assistant"
              )
          ),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to contact Invora AI."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.message,
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I couldn't analyse your account data right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div className="flex h-[620px] flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl shadow-pink-200/50">
      <div className="border-b border-pink-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-200 text-lg text-pink-800">
            ✦
          </div>

          <div>
            <h2 className="font-semibold text-pink-500">
              Invora AI
            </h2>

            <p className="text-xs text-stone-500">
              AI credit & receivables assistant
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "bg-pink-200 text-pink-800"
                  : "bg-yellow-50 text-stone-700"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-yellow-50 px-4 py-3 text-sm text-stone-500">
              Invora is analysing your data...
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="border-t border-pink-100 px-6 py-4">
          <p className="mb-3 text-xs font-medium text-stone-500">
            Suggested questions
          </p>

          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => sendMessage(question)}
                className="rounded-full border border-pink-100 px-3 py-1.5 text-xs text-stone-600 transition hover:border-pink-200 hover:bg-stone-50 hover:text-pink-800"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t border-pink-100 p-4"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            placeholder="Ask Invora about your receivables..."
            disabled={loading}
            className="flex-1 rounded-xl border border-pink-100 px-4 py-3 text-sm outline-none transition focus:border-pink-400"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-pink-200 px-5 py-3 text-sm font-medium text-pink-800 transition hover:bg-pink-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}