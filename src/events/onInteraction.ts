import { contextMenuCommandList } from "@/handlers/contextMenuCommands/index.js";
import { slashCommandList } from "@/handlers/slashCommands/index.js";
import { Interaction } from "discord.js";

export const onInteraction = async (interaction: Interaction) => {
	if (interaction.isChatInputCommand()) {
		for (const command of slashCommandList) {
			if (interaction.commandName === command.data.name) {
				command.execute(interaction).catch(console.error);

				return;
			}
		}
	}

	if (interaction.isContextMenuCommand()) {
		for (const contextCommand of contextMenuCommandList) {
			if (interaction.commandName === contextCommand.data.name) {
				contextCommand.execute(interaction).catch(console.error);

				return;
			}
		}
	}
};
