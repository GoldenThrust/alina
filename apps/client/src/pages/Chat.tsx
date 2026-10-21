import { ArrowUp, CircleHelp, Loader2 } from "lucide-react";
import type { SubmitEventHandler } from "react";
import PageHeading from "../components/PageHeading";
import { useChatHistory } from "../hooks/useChatHistory";
import { useChatScroll } from "../hooks/useChatScroll";
import { useSendMessage } from "../hooks/useSendMessage";
import { useChatStore, useConversation } from "../stores/chat.store";
import { useAuthStore } from "../stores";

export default function Chat() {
  const user = useAuthStore((state) => state.user);
  const messages = useConversation();
  const draft = useChatStore((s) => s.draft);
  const setDraft = useChatStore((s) => s.setDraft);
  const awaitingReply = useChatStore((s) => s.awaitingReply);
  const error = useChatStore((s) => s.error);

  const { initialized, hasMore, loadingOlder, loadOlder, retry } = useChatHistory();
  const send = useSendMessage(user?.id ?? "You");
  const { listRef, onScroll } = useChatScroll({ messages, hasMore, loadingOlder, error, loadOlder });

  const sendMessage: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <div className="page-content chat-page">
      <PageHeading
        eyebrow="A space to ask"
        title="Ask Alina"
        description="Talk through a sample skin snapshot and the questions it brings up."
      />
      <div className="chat-layout">
        <section className="panel conversation-panel">
          <div className="conversation-context">
            <span className="alina-avatar">
              <img src="alina.svg" alt="Alina" className="w-5!" />
            </span>
            <span>
              <strong>Alina</strong>
            </span>
            <CircleHelp size={17} />
          </div>

          <div className="message-list-wrap">
            {loadingOlder ? (
              <div className="message-list-status" role="status">
                <Loader2 size={13} className="spin" /> Loading earlier messages…
              </div>
            ) : null}

            <div className="message-list" ref={listRef} onScroll={onScroll} aria-live="polite">
              {!initialized && !error ? (
                <div className="message-list-placeholder">
                  <Loader2 size={18} className="spin" />
                </div>
              ) : null}

              {!initialized && error ? (
                <div className="message-list-placeholder">
                  <p>{error}</p>
                  <button className="button button-secondary" type="button" onClick={retry}>
                    Try again
                  </button>
                </div>
              ) : null}

              {initialized && messages.length === 0 ? (
                <p className="message-list-start">No messages yet. Ask Alina something to get started.</p>
              ) : null}

              {initialized && !hasMore && messages.length > 0 ? (
                <p className="message-list-start">Beginning of your conversation</p>
              ) : null}

              {messages.map((message) => {
                const fromUser = message.sender === "USER";
                return (
                  <div
                    className={`chat-message ${fromUser ? "you" : "alina"}${message.pending ? " pending" : ""}`}
                    key={message.id}
                  >
                    {!fromUser ? (
                      <span className="message-avatar">
                        <img src="alina.svg" alt="Alina" className="w-3!" />
                      </span>
                    ) : null}
                    <p>{message.content}</p>
                  </div>
                );
              })}

              {awaitingReply ? (
                <div className="chat-message alina" aria-label="Alina is typing">
                  <span className="message-avatar">
                    <img src="alina.svg" alt="" className="w-3!" />
                  </span>
                  <p className="typing">
                    <i />
                    <i />
                    <i />
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {initialized && error ? (
            <p className="form-message form-error" role="alert">
              {error}
            </p>
          ) : null}

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
              disabled={!draft.trim() || awaitingReply}
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
        </aside>
      </div>
    </div>
  );
}