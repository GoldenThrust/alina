import { useRef, type SubmitEventHandler } from "react";
import { AnimatePresence, MotionConfig, motion, type Variants } from "motion/react";
import { ArrowDown, ArrowUp, Info, Loader2, Sparkles, WifiOff } from "lucide-react";
import PageHeading from "../components/PageHeading";
import { useSocket } from "../context/SocketContext"; // wherever your provider lives
import { useChatHistory } from "../hooks/useChatHistory";
import { useChatScroll } from "../hooks/useChatScroll";
import { useSendMessage } from "../hooks/useSendMessage";
import { useAuthStore } from "../stores";
import { useChatStore, useConversation } from "../stores/chat.store";
import { EASE, container, item as fadeUp } from "../utils/motion";

/* ---------- Motion presets ---------- */

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const pop: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

const SUGGESTIONS = [
  "What changed in my last check-in?",
  "Why does consistency matter?",
  "What should I keep simple?",
];

const ALINA = "alina.svg";

export default function Chat() {
  const user = useAuthStore((state) => state.user);
  const { connected } = useSocket();
  const messages = useConversation();
  const draft = useChatStore((s) => s.draft);
  const setDraft = useChatStore((s) => s.setDraft);
  const awaitingReply = useChatStore((s) => s.awaitingReply);
  const error = useChatStore((s) => s.error);

  const { initialized, hasMore, loadingOlder, loadOlder, retry } = useChatHistory();
  const send = useSendMessage(user?.id ?? "You");
  const { listRef, onScroll, atBottom, scrollToBottom } = useChatScroll({
    messages,
    hasMore,
    loadingOlder,
    error,
    loadOlder,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // While a reply streams, the empty bubble is hidden and the typing dots stand in for it
  const last = messages.at(-1);
  const isStreaming = !!last?.streaming;
  const visibleMessages = last?.streaming && !last.content ? messages.slice(0, -1) : messages;
  const showTyping = awaitingReply && !(last && last.sender !== "USER" && last.content.length > 0);

  const isEmpty = initialized && visibleMessages.length === 0 && !showTyping;
  const canSend = !!draft.trim() && !awaitingReply && connected;
  const showChips = initialized && !isEmpty && !awaitingReply && !draft.trim();
  const statusText = !connected ? "Connecting…" : awaitingReply ? "Typing…" : "Online";

  const sendMessage: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    send(draft);
  };

  const pickSuggestion = (question: string) => {
    setDraft(question);
    inputRef.current?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div className="page-content chat-page" variants={container} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <PageHeading
            eyebrow="A space to ask"
            title="Ask Alina"
            description="Talk through your check-ins and the questions they bring up."
          />
        </motion.div>

        <motion.section className="panel ch-shell" variants={fadeUp}>
          {/* ---------- Header ---------- */}
          <header className="ch-header">
            <span className="ch-avatar-wrap">
              {awaitingReply ? (
                <motion.span
                  className="ch-avatar-ring"
                  aria-hidden="true"
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                />
              ) : null}
              <motion.span
                className="ch-avatar"
                animate={awaitingReply ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                transition={
                  awaitingReply ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }
                }
              >
                <img src={ALINA} alt="Alina" />
              </motion.span>
            </span>

            <span className="ch-title">
              <strong>Alina</strong>
              <small className={`ch-status ${connected ? "online" : "offline"}`}>
                <i />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={statusText}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {statusText}
                  </motion.span>
                </AnimatePresence>
              </small>
            </span>

            <span className="ch-badge">
              <Info size={12} /> General info only
            </span>
          </header>

          {/* ---------- Messages ---------- */}
          <div className="ch-list-wrap">
            <AnimatePresence>
              {loadingOlder ? (
                <motion.div
                  key="loading-older"
                  className="ch-older"
                  role="status"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Loader2 size={13} className="spin" /> Loading earlier messages…
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Announcing every streamed chunk would be noisy, so live updates pause while streaming */}
            <div
              className="ch-list"
              ref={listRef}
              onScroll={onScroll}
              aria-live={isStreaming ? "off" : "polite"}
            >
              {!initialized && !error ? (
                <div className="ch-placeholder">
                  <Loader2 size={20} className="spin" />
                </div>
              ) : null}

              {!initialized && error ? (
                <div className="ch-placeholder">
                  <p>{error}</p>
                  <button className="button button-secondary" type="button" onClick={retry}>
                    Try again
                  </button>
                </div>
              ) : null}

              {isEmpty ? (
                <motion.div className="ch-empty" variants={stagger} initial="hidden" animate="show">
                  <motion.span className="ch-empty-icon" variants={pop}>
                    <Sparkles size={20} />
                  </motion.span>
                  <motion.strong variants={pop}>Start the conversation</motion.strong>
                  <motion.small variants={pop}>
                    Ask Alina about your latest check-in, or begin with one of these.
                  </motion.small>
                  <div className="ch-starters">
                    {SUGGESTIONS.map((question) => (
                      <motion.button
                        key={question}
                        type="button"
                        className="ch-starter"
                        variants={pop}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => pickSuggestion(question)}
                      >
                        {question}
                        <ArrowUp size={14} />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {initialized && !hasMore && visibleMessages.length > 0 ? (
                <p className="ch-start">Beginning of your conversation</p>
              ) : null}

              {visibleMessages.map((message, index) => {
                const fromUser = message.sender === "USER";
                const live = !!message.streaming;
                // Only messages created in this session animate in; loaded history appears instantly
                const isNew = message.pending || live;
                // Consecutive messages from the same sender are grouped
                const grouped = visibleMessages[index - 1]?.sender === message.sender;

                return (
                  <motion.div
                    className={`ch-msg ${fromUser ? "you" : "alina"}${grouped ? " grouped" : ""}${message.pending ? " pending" : ""}${live ? " streaming" : ""}`}
                    key={message.id}
                    style={{ transformOrigin: fromUser ? "100% 100%" : "0% 100%" }}
                    initial={isNew ? { opacity: 0, y: 10, x: fromUser ? 14 : -14, scale: 0.97 } : false}
                    animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  >
                    {!fromUser ? (
                      <span className={`ch-msg-avatar${grouped ? " hidden" : ""}`}>
                        {grouped ? null : <img src={ALINA} alt="Alina" />}
                      </span>
                    ) : null}
                    <p>{message.content}</p>
                  </motion.div>
                );
              })}

              <AnimatePresence>
                {showTyping ? (
                  <motion.div
                    key="typing"
                    className="ch-msg alina"
                    aria-label="Alina is typing"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="ch-msg-avatar">
                      <img src={ALINA} alt="" />
                    </span>
                    <p className="ch-typing">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                        />
                      ))}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Appears when the user has scrolled up */}
            <div className="ch-jump-wrap">
              <AnimatePresence>
                {!atBottom && visibleMessages.length > 0 ? (
                  <motion.button
                    key="jump"
                    className="ch-jump"
                    type="button"
                    onClick={scrollToBottom}
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowDown size={14} /> {isStreaming ? "Alina is replying" : "Jump to latest"}
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {initialized && error ? (
              <motion.div
                key="error"
                className="ch-notice"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <p className="form-message form-error" role="alert">
                  {error}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* ---------- Composer ---------- */}
          <div className="ch-dock">
            <AnimatePresence initial={false}>
              {showChips ? (
                <motion.div
                  key="chips"
                  className="ch-chips"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  {SUGGESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="ch-chip"
                      onClick={() => pickSuggestion(question)}
                    >
                      {question}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <form className="ch-composer" onSubmit={sendMessage}>
              <label className="sr-only" htmlFor="chat-message">
                Your message
              </label>
              <input
                id="chat-message"
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Alina anything about your skin…"
                autoComplete="off"
              />
              <motion.button
                className="ch-send"
                type="submit"
                aria-label="Send message"
                disabled={!canSend}
                whileHover={canSend ? { scale: 1.07 } : undefined}
                whileTap={canSend ? { scale: 0.9 } : undefined}
              >
                {/* Arrow morphs into a spinner while a reply is on its way */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={awaitingReply ? "wait" : "send"}
                    className="ch-send-icon"
                    initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                  >
                    {awaitingReply ? <Loader2 size={16} className="spin" /> : <ArrowUp size={17} />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </form>

            <AnimatePresence initial={false}>
              {!connected ? (
                <motion.p
                  key="offline"
                  className="ch-offline"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <WifiOff size={12} /> Reconnecting… you can send once you’re back online.
                </motion.p>
              ) : null}
            </AnimatePresence>

            <p className="ch-disclaimer">
              Alina shares general skincare information, not medical advice.
            </p>
          </div>
        </motion.section>
      </motion.div>
    </MotionConfig>
  );
}