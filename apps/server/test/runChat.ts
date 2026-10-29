process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

fetch("https://192.168.1.100/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    input: "What changed in my last check-in?"
  }),
})
  .then((res) => res.text())
  .then((text) => console.log(text));
