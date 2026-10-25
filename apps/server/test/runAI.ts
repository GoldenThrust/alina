process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

fetch("https://192.168.1.100/ai").then((res) => res.text()).then((text) => console.log(text)) ;