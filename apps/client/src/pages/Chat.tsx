import { ArrowUp, Bot, CircleHelp, Sparkles } from "lucide-react";
import { useCallback, useState, type SubmitEventHandler } from "react";
import PageHeading from "../components/PageHeading";

type Message = { from: "alina" | "you"; text: string };

export default function Chat() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "alina",
      text: "Your sample check-ins show hydration moving in a steadier direction. That's a small signal, not proof of a cause.",
    },
    { from: "you", text: "What should I keep in mind?" },
    {
      from: "alina",
      text: "Keeping the routine consistent makes future comparisons more useful. This demo conversation is illustrative and is not connected to an AI service.",
    },
  ]);
  const sendMessage: SubmitEventHandler<HTMLFormElement> = useCallback((event) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setMessages((current) => [
      ...current,
      { from: "you", text: question },
      {
        from: "alina",
        text: "This sample assistant is not connected yet. In the completed build, Alina will answer using your saved scan evidence and explain what remains uncertain.",
      },
    ]);
    setDraft("");
  }, [draft]);
  
  return (
    <div className="page-content chat-page">
      <PageHeading
        eyebrow="A space to ask"
        title="Ask Alina"
        description="Talk through a sample skin snapshot and the questions it brings up."
        action={
          <span className="demo-label">
            <Bot size={14} /> SAMPLE CHAT
          </span>
        }
      />
      <div className="chat-layout">
        <section className="panel conversation-panel">
          <div className="conversation-context">
            <span className="alina-avatar">
              <Sparkles size={17} />
            </span>
            <span>
              <strong>Alina</strong>
              <small>Sample assistant · not connected to AI</small>
            </span>
            <CircleHelp size={17} />
          </div>
          <div className="message-list" aria-live="polite">
            {messages.map((message, index) => (
              <div
                className={`chat-message ${message.from}`}
                key={`${message.from}-${index}`}
              >
                {message.from === "alina" ? (
                  <span className="message-avatar">
                    <Sparkles size={13} />
                  </span>
                ) : null}
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          <form className="chat-composer" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="chat-message">
              Your message
            </label>
            <input
              id="chat-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your sample results…"
            />
            <button
              className="send-button"
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim()}
            >
              <ArrowUp size={17} />
            </button>
          </form>
          <p className="chat-disclaimer">
            Alina shares general skincare information, not medical advice.
          </p>
        </section>
        <aside className="panel chat-suggestions">
          <p className="page-eyebrow">SAMPLE QUESTIONS</p>
          <h2>Where would you like to start?</h2>
          {[
            "What changed in my last check-in?",
            "Why does consistency matter?",
            "What should I keep simple?",
          ].map((question) => (
            <button
              className="suggestion-button"
              type="button"
              key={question}
              onClick={() => setDraft(question)}
            >
              {question}
              <span>↗</span>
            </button>
          ))}
          <div className="chat-context-note">
            <Sparkles size={15} />
            <p>
              <strong>Context matters.</strong>
              <small>
                Future answers will use saved scan history and your preferences.
              </small>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
