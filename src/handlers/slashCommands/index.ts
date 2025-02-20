import { SlashCommand } from "@/interfaces/slashCommand.js";
import { archiveCategory } from "./archiveCategory.js";
import { addEmoji } from "./addEmoji.js";
import { setPersonalServer } from "./setPersonalServer.js";
import { deleteCategory } from "./deleteCategory.js";

export const slashCommandList: SlashCommand[] = [
	archiveCategory,
	deleteCategory,
	addEmoji,
	setPersonalServer,
];
