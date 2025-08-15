from asyncio import subprocess as subproc, Event
import asyncio
import json
from typing import Optional, Any, TypedDict, cast


class ReplyOK(TypedDict):
    id: int
    result: Any


class ReplyError(TypedDict):
    id: int
    error: str


Reply = ReplyOK | ReplyError


class NodeJSAgent:
    def __init__(self) -> None:
        self.process: Optional[subproc.Process] = None
        self.next_reply_id = 1
        self.reply_event: dict[int, Event] = {}
        self.reply: dict[int, Reply] = {}
        self.stdin_lock = asyncio.Lock()


    async def agent_run(self) -> None:
        self.process = await subproc.create_subprocess_exec(
            "node",
            "ankirus_nodejs",
            stdin=subproc.PIPE,
            stdout=subproc.PIPE,
        )
        asyncio.create_task(self.handle_stdout())

    async def handle_stdout(self) -> None:
        if self.process is None:
            return
        assert self.process.stdout is not None
        while not self.process.stdout.at_eof():
            output = await self.process.stdout.readline()
            if output == b"":
                continue
            data = json.loads(output.decode())
            if "id" in data:
                data_id = data["id"]
                if data_id in self.reply_event:
                    self.reply_event[data_id].set()
                    self.reply[data_id] = data
                    del self.reply_event[data_id]

    async def agent_call(self, name: str, args: Any) -> Any:
        if self.process is None:
            await self.agent_run()
        assert self.process is not None
        assert self.process.stdin is not None
        this_id = self.next_reply_id
        this_event = Event()
        self.reply_event[this_id] = this_event
        self.next_reply_id += 1
        request = (
            json.dumps(
                {"id": this_id, "name": name, "args": args},
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode()
            + b"\n"
        )
        async with self.stdin_lock:
            self.process.stdin.write(request)
            await self.process.stdin.drain()
        await this_event.wait()
        reply = self.reply[this_id]
        del self.reply[this_id]
        if "result" not in reply:  # Make mypy happy
            raise Exception(reply["error"])
        elif "error" not in reply:
            return reply["result"]
        else:
            assert False

    async def agent_close(self) -> None:
        if self.process is not None:
            assert self.process.stdin is not None
            self.process.stdin.close()
            await self.process.wait()
            self.process = None
        for event in self.reply_event.values():
            event.set()
        for reply_id in self.reply.keys():
            self.reply[reply_id] = {"id": reply_id, "error": "Agent closed"}

        self.reply_event.clear()
        self.reply.clear()

    def __del__(self) -> None:
        if self.process is not None:
            assert self.process.stdin is not None
            self.process.stdin.close()

    async def test(self, value: str) -> str:
        return cast(str, await self.agent_call("test", value))
    
    async def purify(self, value: str) -> str:
        return cast(str, await self.agent_call("purify", value))

    async def mathjax(self, value: str) -> str:
        return cast(str, await self.agent_call("mathjax", value))
