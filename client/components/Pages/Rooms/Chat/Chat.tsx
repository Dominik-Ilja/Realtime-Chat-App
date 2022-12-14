import { useRouter } from "next/router";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { io } from "socket.io-client";

import * as SOCKET_EVENTS from "../../../../shared/socketEvents";
import ChatSidebar from "./ChatSidebar";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

type user = {
  name: string | null;
  room: string | null;
};
type message = {
  name: string;
  message: string;
  timestamp: string;
};
type Props = {
  name: string;
  room: string;
  showSidebar?: boolean;
};

/*
  By default socket.io uses the same URL as browser
  to listen for client server communication. Since we have a separate
  client and server we point the socket on the client to the url of the server.

  We need to have the socket be initialized outside of the component to prevent
  multiple instances from being generate on re-render.
*/
const serverEndpoint =
  process.env.ENDPOINT || "https://realtime-chat-app-server.onrender.com/";
let socket = io(serverEndpoint);

const Chat = (props: Props) => {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState<message[]>([]);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedMsg = message.trim();

    if (trimmedMsg !== "") {
      socket.emit(
        SOCKET_EVENTS.CLIENT_MESSAGE,
        props.name,
        props.room,
        trimmedMsg,
        () => setMessage("")
      );
    }
  };
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };
  useEffect(() => {
    if (socket.disconnected) {
      socket.connect();
    }

    socket.on(SOCKET_EVENTS.SERVER_MESSAGE, (msg) => {
      setMessages(msg);
    });
    socket.on("join server", (users) => {
      setUsers(users);
    });
    socket.on("user disconnect server", (users) => {
      setUsers(users);
    });
    socket.emit("join", props.name, props.room, (error: string | null) => {
      if (error !== null) {
        console.log(error);

        alert(error);
        router.push("/");
      }
    });

    const routeChangeHandler = () => socket.disconnect();
    router.events.on("routeChangeStart", routeChangeHandler);

    return () => {
      socket.off(SOCKET_EVENTS.SERVER_MESSAGE);
      socket.off("join server");
      router.events.off("routeChangeStart", routeChangeHandler);
    };
  }, []);

  return (
    <div className="relative z-10 flex overflow-hidden bg-bg">
      <div className="relative flex flex-col justify-between w-full min-w-0 px-3 pb-3 md:pb-4 md:pl-8">
        <ChatMessages messages={messages} />
        <ChatInput
          onSubmit={handleFormSubmit}
          onChange={handleChange}
          message={message}
          room={props.room}
        />
      </div>
      <ChatSidebar users={users} show={props.showSidebar} />
    </div>
  );
};

export default Chat;
