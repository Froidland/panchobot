import { ContextMenuCommand } from "@/interfaces/contextMenuCommand.js";
import { addEmoji } from "./addEmoji.js";
import { addEmojiPersonal } from "./addEmojiPersonal.js";

export const contextMenuCommandList: ContextMenuCommand[] = [
	addEmoji,
	addEmojiPersonal,
];
