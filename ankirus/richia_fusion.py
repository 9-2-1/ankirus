def fusion(i: int, c: str) -> str:
    if 0x4E00 <= ord(c) < 0xA000:
        # analog a CJK glitch
        return chr(((ord(c) - 0x4E00) + i * 1934) % (0xA000 - 0x4E00) + 0x4E00)
    return c


def richia_fusion(x: str) -> str:
    # replace text with placeholder to hide from others while still recognizable
    u = "".join([fusion(i, c) for i, c in enumerate(x)])
    return u
